const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configuración
let config;
try {
  config = require('./config.json');
} catch (e) {
  console.error('❌ No se encontró config.json');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Carpetas
const BOOKS_FOLDER = config.booksFolder || 'C:\\MisLibros';
const PDF_FOLDER = path.join(BOOKS_FOLDER, 'pdfs');
const COVERS_FOLDER = path.join(BOOKS_FOLDER, 'covers');

// Crear carpetas si no existen
[PDF_FOLDER, COVERS_FOLDER].forEach(folder => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
});

// Helper: verificar API Key
const verifyKey = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (key !== config.apiKey) return res.status(401).json({ error: 'API key inválida' });
  next();
};

// Helper: listar archivos de carpeta
const listFiles = (folder, extensions) => {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter(f => extensions.some(ext => f.toLowerCase().endsWith(ext)))
    .map(f => ({ name: f, size: fs.statSync(path.join(folder, f)).size }));
};

// Helper: servir archivo
const serveFile = (folder, filename, mime, res) => {
  const filepath = path.join(folder, filename);
  if (!filepath.startsWith(folder) || !fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  res.setHeader('Content-Type', mime);
  fs.createReadStream(filepath).pipe(res);
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'PC Server', time: new Date().toISOString() });
});

// Listar archivos
app.get('/files', verifyKey, (req, res) => {
  try {
    res.json({
      pdfs: listFiles(PDF_FOLDER, ['.pdf']),
      covers: listFiles(COVERS_FOLDER, ['.jpg', '.png', '.jpeg', '.webp']),
      booksFolder: BOOKS_FOLDER
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Servir PDF
app.get('/file/pdf/:filename', verifyKey, (req, res) => {
  serveFile(PDF_FOLDER, req.params.filename, 'application/pdf', res);
});

// Servir imagen
app.get('/file/cover/:filename', verifyKey, (req, res) => {
  const ext = path.extname(req.params.filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  serveFile(COVERS_FOLDER, req.params.filename, mime, res);
});

// Comunicación con servidor principal
const apiCall = (endpoint, method = 'post', data = {}) => 
  axios({ method, url: `${config.serverUrl}/api/remote/${endpoint}`, data, 
    headers: { 'x-api-key': config.apiKey }, timeout: method === 'post' ? 10000 : 5000 
  }).catch(() => null);

const register = async (url) => {
  const res = await apiCall('register', 'post', { url, name: config.pcName || 'Mi PC' });
  if (res) console.log('✅ Registrado con el servidor principal');
  return !!res;
};

// Iniciar servidor
const PORT = config.localPort || 3001;
const publicUrl = process.env.TUNNEL_URL;

app.listen(PORT, async () => {
  console.log('\n========================================');
  console.log('  📚 PC SERVER - BIBLIOTECA VIRTUAL');
  console.log('========================================');
  console.log(`📁 Carpeta: ${BOOKS_FOLDER}`);
  console.log(`🖥️  Local: http://localhost:${PORT}`);
  
  if (publicUrl) {
    console.log(`🌐 Público: ${publicUrl}`);
    if (await register(publicUrl)) {
      setInterval(() => apiCall('heartbeat'), 30000);
      console.log('💓 Heartbeat activo');
    }
  }
  
  console.log('\n✅ Servidor corriendo');
  console.log('   Presiona Ctrl+C para detener');
  console.log('========================================');
});

// Cerrar limpio
const cleanup = async () => {
  await apiCall('disconnect');
  process.exit(0);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);