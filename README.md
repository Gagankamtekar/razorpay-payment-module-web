# Razorpay Payment Module

## Setup
1. `cd backend && npm install`
2. Copy `backend/.env.example` to `backend/.env` and fill in your keys.
3. Create tables: `node backend/database/migrate.js --db "MYSQL" --user "root" --pass "your_password"`

## Express
    const payments = require('./backend/paymentApis');
    app.use(express.json());
    app.use('/api/payments', payments);

## React
    import { RazorpayPaymentCard } from './frontend/paymentmodule';
    <RazorpayPaymentCard keyId="rzp_test_xxx" title="Course" price={999} />

Routes: POST /create-order, POST /verify, GET /history, POST /refund
