require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const model = require('./database/model');

const router = express.Router();

// CORS: lets web apps on other ports (for example localhost:3000) call these APIs.
// Set CORS_ORIGIN in .env to your app's address in production (for example https://myshop.com).
router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Middleware to secure admin-only API routes (e.g., payment history, refunds).
 * It verifies that the incoming request provides a valid admin API key in the headers.
 */

function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key') || '';
  const expected = process.env.ADMIN_API_KEY || '';
  const ok =
    expected.length > 0 &&
    key.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
//creatre order (amount is in rupees from the frontend)
router.post('/create-order', async (req, res) => {
    try{
        const{amount, currency = 'INR', title,email} =req.body;
        if(!amount || amount <= 0){
            return res.status(400).json({error: 'Invalid amount'});
        }
        const paise = Math.round(Number(amount)* 100);
        const order = await razorpay.orders.create({
            amount: paise,
            currency,
            receipt: `rcpt_${Date.now()}`,
        
        });
        await model.createPayment({ orderId:order.id, amount:paise, currency, title,email});
        res.json({
            orderId: order.id,
             amount: paise, 
             currency,
             keyId: process.env.RAZORPAY_KEY_ID,
            });
        } catch (e){
            res.status(500).json({error: e.message});
        }
    });
// verify signature after payment
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      await model.markFailed(razorpay_order_id);
      return res.status(400).json({ success: false, error: 'Signature mismatch' });
    }

    // Ask Razorpay directly that this order was paid
    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Order not paid' });
    }

    await model.markPaid(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
//Payemnt history
router.get   ('/history',requireAdmin, async(req,res)=>{
    try{
        const rows = await model.listPayments(req.query.limit,req.query.offset);
        res.json(rows);
    } catch (e){
        res.status(500).json({error: e.message});
    }
});

//Refund (amount optional ,in paise; full refund if omitted)
router.post('/refund', requireAdmin,async (req,res) =>{
    try{
        const { paymentId, amount } = req.body;
        const refund =await razorpay.payments.refund(paymentId, amount ? {amount} :{});
        await model.markRefunded(paymentId);
        res.json({success:true, refund});
    } catch (e){
        res.status(500).json({error: e.message});
    }
});
 module.exports = router;