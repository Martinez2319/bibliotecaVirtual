const express = require('express');
const router = express.Router();
const axios = require('axios');
const RemoteSource = require('../models/RemoteSource');
const { adminOnly } = require('../middleware/auth');

const API_KEY = () => process.env.REMOTE_API_KEY;

// Middleware: verificar API key
const verifyKey = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (key !== API_KEY()) return res.status(401).json({ error: 'API key inválida' });
  next();
};

// Helper: obtener fuente activa
const getSource = (online = false) => RemoteSource.findOne({ 
  apiKey: API_KEY(), 
  ...(online && { isOnline: true }) 
});

// === ENDPOINTS PARA PC REMOTO ===

// POST registrar PC
router.post('/register', verifyKey, async (req, res) => {
  try {
    const { url, name } = req.body;
    if (!url) return res.status(400).json({ error: 'URL requerida' });

    let source = await getSource();
    if (source) {
      Object.assign(source, { url, name: name || source.name, isOnline: true, lastSeen: new Date() });
      await source.save();
    } else {
      source = await RemoteSource.create({ url, name: name || 'Mi PC', apiKey: API_KEY(), isOnline: true, lastSeen: new Date() });
    }
    res.json({ success: true, message: 'PC registrado', source: { name: source.name, url: source.url } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST heartbeat
router.post('/heartbeat', verifyKey, async (req, res) => {
  try {
    const source = await getSource();
    if (source) {
      source.lastSeen = new Date();
      source.isOnline = true;
      await source.save();
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST desconectar
router.post('/disconnect', verifyKey, async (req, res) => {
  try {
    const source = await getSource();
    if (source) {
      source.isOnline = false;
      await source.save();
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === ENDPOINTS PARA ADMIN ===

// GET estado
router.get('/status', adminOnly, async (req, res) => {
  try {
    const source = await getSource();
    if (!source) return res.json({ connected: false, message: 'No hay PC configurado' });

    // Verificar si está online (última vez visto hace menos de 60s)
    if (source.lastSeen && Date.now() - source.lastSeen.getTime() >= 60000) {
      source.isOnline = false;
      await source.save();
    }

    res.json({ connected: source.isOnline, name: source.name, url: source.url, lastSeen: source.lastSeen });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET archivos
router.get('/files', adminOnly, async (req, res) => {
  try {
    const source = await getSource(true);
    if (!source) return res.status(404).json({ error: 'PC no conectado' });

    const { data } = await axios.get(`${source.url}/files`, {
      headers: { 'x-api-key': API_KEY() },
      timeout: 10000
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo conectar con el PC' });
  }
});

// GET proxy archivo
router.get('/file/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    if (!['pdf', 'cover'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' });

    const source = await getSource(true);
    if (!source) return res.status(404).json({ error: 'PC no conectado' });

    const response = await axios.get(`${source.url}/file/${type}/${filename}`, {
      headers: { 'x-api-key': API_KEY() },
      responseType: 'stream',
      timeout: 30000
    });

    if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo obtener el archivo' });
  }
});

module.exports = router;