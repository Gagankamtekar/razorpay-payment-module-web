const express = require('express');
const payments = require('./paymentApis');
const app = express();
app.use(express.json());
app.use('/api/payments', payments);
app.listen(5000, () => console.log('API on http://localhost:5000'));