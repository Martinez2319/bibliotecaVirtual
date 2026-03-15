const express = require('express');
const router = express.Router();
const axios = require('axios');
const Donation = require('../models/Donation');
const { adminOnly } = require('../middleware/auth');

const getPaypalUrl = () => process.env.PAYPAL_MODE === 'sandbox' 
  ? 'https://api-m.sandbox.paypal.com' 
  : 'https://api-m.paypal.com';

const getPaypalToken = async () => {
  const res = await axios.post(`${getPaypalUrl()}/v1/oauth2/token`, 'grant_type=client_credentials', {
    auth: { username: process.env.PAYPAL_CLIENT_ID, password: process.env.PAYPAL_SECRET },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return res.data.access_token;
};

// GET config para frontend
router.get('/config', (req, res) => {
  res.json({
    clientId: process.env.PAYPAL_CLIENT_ID || null,
    mode: process.env.PAYPAL_MODE || 'sandbox',
    currency: 'USD'
  });
});

// POST crear orden
router.post('/create-order', async (req, res) => {
  try {
    const { amount, message } = req.body;
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      return res.status(400).json({ error: 'amount inválido' });
    }

    const { PAYPAL_CLIENT_ID, PAYPAL_SECRET } = process.env;

    // Modo mock si no hay credenciales
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      const mockOrderId = Date.now().toString();
      await Donation.create({ amount: val, message, paypalOrderId: mockOrderId, status: 'pending' });
      return res.json({ orderId: mockOrderId, mode: 'mock' });
    }

    const token = await getPaypalToken();
    const order = await axios.post(`${getPaypalUrl()}/v2/checkout/orders`, {
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: 'USD', value: val.toFixed(2) } }]
    }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    await Donation.create({ amount: val, message, paypalOrderId: order.data.id, status: 'pending' });
    res.json({ orderId: order.data.id, mode: 'live' });
  } catch (e) {
    console.error('PayPal create-order:', e.response?.data || e.message);
    res.status(500).json({ error: 'Error creando orden' });
  }
});

// POST capturar pago
router.post('/capture-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { PAYPAL_CLIENT_ID, PAYPAL_SECRET } = process.env;

    // Modo mock
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      await Donation.findOneAndUpdate({ paypalOrderId: orderId }, { status: 'completed' });
      return res.json({ status: 'completed', mode: 'mock' });
    }

    const token = await getPaypalToken();
    const capture = await axios.post(`${getPaypalUrl()}/v2/checkout/orders/${orderId}/capture`, {}, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    const status = capture.data.status === 'COMPLETED' ? 'completed' : 'failed';
    await Donation.findOneAndUpdate({ paypalOrderId: orderId }, { status });
    res.json({ status, details: capture.data });
  } catch (e) {
    console.error('PayPal capture:', e.response?.data || e.message);
    res.status(500).json({ error: 'Error capturando orden' });
  }
});

// GET donaciones (admin)
router.get('/', adminOnly, async (req, res) => {
  try {
    res.json(await Donation.find().sort({ createdAt: -1 }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;