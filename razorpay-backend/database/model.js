const mysql2 =require('mysql2/promise');

let pool;
function getPool(){
    if(!pool){
        pool = mysql2.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME || 'payments_db',
            waitForConnections: true,
            connectionLimit: 10,
        });
    }
    return pool;
}

async function createPayment({ orderId, amount, currency, title, email }) {
  await getPool().query(
    `INSERT INTO payments (razorpay_order_id, amount, currency, title, customer_email)
     VALUES (?, ?, ?, ?, ?)`,
    [orderId, amount, currency, title || null, email || null]
  );
}

async function markPaid(orderId, paymentId, signature) {
    await getPool().query(
        `UPDATE payments SET status='paid', razorpay_payment_id=?, razorpay_signature=?
        WHERE razorpay_order_id=?`,
        [paymentId, signature, orderId]
    );
}

async function markFailed(orderId) {
    await getPool().query(
        `UPDATE payments SET status='failed' WHERE razorpay_order_id=?`,
        [orderId]
    );
}

async function markRefunded(paymentId) {
    await getPool().query(
        `UPDATE payments SET status='refunded' WHERE razorpay_payment_id=?`,
        [paymentId]
    );
}

async function listPayments(limit = 50, offset = 0){
    const[rows] = await getPool().query(
        `SELECT * FROM payments ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [Number(limit), Number(offset)]
    );
    return rows;
}
module.exports = { createPayment, markPaid, markFailed, markRefunded, listPayments };