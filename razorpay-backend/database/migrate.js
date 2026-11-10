const mysql = require('mysql2/promise');

function getArg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function migrate() {
  const db = getArg('db');
  const user = getArg('user');
  const pass = getArg('pass');
  const host = getArg('host') || 'localhost';
  const name = getArg('name') || 'payments_db';

  if (db !== 'MYSQL') {
    console.error('Only --db "MYSQL" is supported.');
    process.exit(1);
  }
  if (!user || pass === undefined) {
    console.error('Usage: node migrate.js --db "MYSQL" --user "u" --pass "p"');
    process.exit(1);
  }

  const conn = await mysql.createConnection({ host, user, password: pass });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``);
  await conn.changeUser({ database: name });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      razorpay_order_id VARCHAR(64) NOT NULL UNIQUE,
      razorpay_payment_id VARCHAR(64) NULL,
      razorpay_signature VARCHAR(256) NULL,
      amount INT NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      status ENUM('created','paid','failed','refunded') NOT NULL DEFAULT 'created',
      title VARCHAR(255) NULL,
      customer_email VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log('Migration done');
  await conn.end();
}

migrate().catch((e) => {
  console.error(e.message);
  process.exit(1);
});