import { useState } from 'react';

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Razorpay script failed to load'));
    document.body.appendChild(script);
  });
}

const styles = {
  card: {
    background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12,
    padding: 20, maxWidth: 380, fontFamily: 'system-ui, sans-serif',
  },
  image: { width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, marginBottom: 16 },
  title: { margin: 0, fontSize: 16, fontWeight: 500, color: '#111' },
  desc: { margin: '4px 0 0', fontSize: 13, color: '#666' },
  price: { margin: '8px 0 16px', fontSize: 15, fontWeight: 500, color: '#111' },
  error: { margin: '10px 0 0', fontSize: 13, color: '#c0392b' },
};

export function RazorpayPaymentCard({
  apiBase = '/api/payments',
  keyId,
  title = 'Payment',
  desc = '',
  image,
  price = 0,
  currency = 'INR',
  email = '',
  themeColor = '#2f80ed',
  buttonText,
  onSuccess,
  onFailure,
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handlePay() {
    setLoading(true);
    setMessage('');
    try {
      await loadRazorpayScript();

      const res = await fetch(`${apiBase}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: price, currency, title, email }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || 'Could not create order');

      const rzp = new window.Razorpay({
        key: keyId || order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: title,
        description: desc,
        image,
        prefill: { email },
        theme: { color: themeColor },
        handler: async (response) => {
          const v = await fetch(`${apiBase}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          const data = await v.json();
          setLoading(false);
          if (data.success) onSuccess?.(response);
          else {
            setMessage('Payment verification failed');
            onFailure?.(data);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });

      rzp.on('payment.failed', (r) => {
        setLoading(false);
        setMessage(r.error.description);
        onFailure?.(r.error);
      });

      rzp.open();
    } catch (e) {
      setLoading(false);
      setMessage(e.message);
      onFailure?.(e);
    }
  }

  const formattedPrice = `₹${Number(price).toLocaleString('en-IN')}`;

  return (
    <div style={styles.card}>
      {image && <img src={image} alt={title} style={styles.image} />}
      <p style={styles.title}>{title}</p>
      {desc && <p style={styles.desc}>{desc}</p>}
      <p style={styles.price}>Amount: {formattedPrice}</p>
      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          width: '100%', padding: 14, border: 0, borderRadius: 10,
          background: themeColor, color: '#fff', fontSize: 16,
          fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Please wait...' : buttonText || `Pay ${formattedPrice} with Razorpay`}
      </button>
      {message && <p style={styles.error}>{message}</p>}
    </div>
  );
}

export default RazorpayPaymentCard;