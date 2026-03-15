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

// GET proxy archivo CON CACHÉ
const fileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

router.get('/file/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    if (!['pdf', 'cover'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' });

    const cacheKey = `${type}:${filename}`;
    const cached = fileCache.get(cacheKey);
    
    // Para covers, usar caché en memoria
    if (type === 'cover' && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached.data);
    }

    const source = await getSource(true);
    if (!source) return res.status(404).json({ error: 'PC no conectado' });

    // Para PDFs, usar streaming directo sin caché
    if (type === 'pdf') {
      const response = await axios.get(`${source.url}/file/${type}/${filename}`, {
        headers: { 'x-api-key': API_KEY() },
        responseType: 'stream',
        timeout: 60000
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      response.data.pipe(res);
      return;
    }

    // Para covers, descargar y cachear
    const response = await axios.get(`${source.url}/file/${type}/${filename}`, {
      headers: { 'x-api-key': API_KEY() },
      responseType: 'arraybuffer',
      timeout: 15000
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // Guardar en caché (solo si es menor a 2MB)
    if (response.data.length < 2 * 1024 * 1024) {
      fileCache.set(cacheKey, {
        data: Buffer.from(response.data),
        contentType,
        timestamp: Date.now()
      });
      
      // Limpiar caché vieja cada 100 entradas
      if (fileCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of fileCache) {
          if (now - value.timestamp > CACHE_TTL) fileCache.delete(key);
        }
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'MISS');
    res.send(response.data);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo obtener el archivo' });
  }
});

module.exports = router;