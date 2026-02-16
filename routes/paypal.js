const express = require('express');
const router = express.Router();
const axios = require('axios');
const Donation = require('../models/Donation');

// Crear orden PayPal
router.post('/create-order', async (req, res) => {
  try {
    const { amount, message } = req.body;
    const orderId = Date.now().toString();
    
    await Donation.create({ amount, message, paypalOrderId: orderId, status: 'pending' });

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;

    // Modo mock si no hay credenciales
    if (!clientId || !secret) {
      return res.json({ orderId, mode: 'mock' });
    }

    // PayPal real
    const baseUrl = process.env.PAYPAL_MODE === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';

    const auth = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
      auth: { username: clientId, password: secret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const order = await axios.post(`${baseUrl}/v2/checkout/orders`, {
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: 'USD', value: amount.toString() } }]
    }, {
      headers: { 'Authorization': `Bearer ${auth.data.access_token}`, 'Content-Type': 'application/json' }
    });

    await Donation.findOneAndUpdate({ paypalOrderId: orderId }, { paypalOrderId: order.data.id });
    res.json({ orderId: order.data.id, mode: 'live' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Capturar pago
router.post('/capture-order/:orderId', async (req, res) => {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;

    // Modo mock
    if (!clientId || !secret) {
      await Donation.findOneAndUpdate({ paypalOrderId: req.params.orderId }, { status: 'completed' });
      return res.json({ status: 'completed', mode: 'mock' });
    }

    const baseUrl = process.env.PAYPAL_MODE === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';

    const auth = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
      auth: { username: clientId, password: secret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const capture = await axios.post(`${baseUrl}/v2/checkout/orders/${req.params.orderId}/capture`, {}, {
      headers: { 'Authorization': `Bearer ${auth.data.access_token}`, 'Content-Type': 'application/json' }
    });

    const status = capture.data.status === 'COMPLETED' ? 'completed' : 'failed';
    await Donation.findOneAndUpdate({ paypalOrderId: req.params.orderId }, { status });
    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener donaciones (admin)
router.get('/', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const donations = await Donation.find().sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
