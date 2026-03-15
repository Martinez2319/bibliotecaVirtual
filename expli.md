
🖥️ SISTEMA PC REMOTO - EXPLICACIÓN COMPLETA
📊 Diagrama de Arquitectura
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    │                              │
          ┌─────────▼─────────┐          ┌────────▼────────┐
          │   CLOUDFLARED     │          │   TU SERVIDOR   │
          │   TUNNEL          │          │   BIBLIOTECA    │
          │ (URL pública)     │          │   (Nube/VPS)    │
          └─────────┬─────────┘          └────────┬────────┘
                    │                              │
                    │                              │
          ┌─────────▼─────────┐          ┌────────▼────────┐
          │   TU PC LOCAL     │◄────────►│   MongoDB       │
          │   (pc-server)     │          │   (Base datos)  │
          │   Puerto 3001     │          │                 │
          └─────────┬─────────┘          └─────────────────┘
                    │
          ┌─────────▼─────────┐
          │   C:\MisLibros    │
          │   ├── pdfs/       │
          │   └── covers/     │
          └───────────────────┘
📁 FLUJO DE COMUNICACIÓN
1. REGISTRO (al iniciar pc-server)
   PC Local ──────────────────────────────► Servidor Principal
            POST /api/remote/register
            {url: "https://xxx.trycloudflare.com", name: "Mi PC"}

2. HEARTBEAT (cada 30 segundos)
   PC Local ──────────────────────────────► Servidor Principal
            POST /api/remote/heartbeat
            (Mantiene conexión activa)

3. CONSULTA DE ARCHIVOS (desde dashboard admin)
   Admin ────► Servidor Principal ────────► PC Local
               GET /api/remote/files         GET /files
               
4. OBTENER ARCHIVO (cuando usuario lee libro)
   Usuario ──► Servidor Principal ────────► PC Local
               GET /api/remote/file/pdf/x    GET /file/pdf/x
               (El servidor actúa como proxy)
📄 PC-SERVER/SERVER.JS - EXPLICACIÓN LÍNEA POR LÍNEA
// ═══════════════════════════════════════════════════════════════
// IMPORTACIÓN DE MÓDULOS
// ═══════════════════════════════════════════════════════════════

const express = require('express');    // Framework web para crear el servidor HTTP
const cors = require('cors');          // Permite peticiones desde otros dominios (Cross-Origin)
const axios = require('axios');        // Cliente HTTP para hacer peticiones al servidor principal
const path = require('path');          // Utilidades para manejar rutas de archivos
const fs = require('fs');              // File System - leer/escribir archivos del disco

// ═══════════════════════════════════════════════════════════════
// CARGAR CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

let config;
try {
  config = require('./config.json');   // Intenta cargar config.json
  /*
    config.json contiene:
    {
      "apiKey": "MiBiblioteca2024SecretKey_AbCdEfGh",  // Clave secreta para autenticar
      "serverUrl": "https://tu-biblioteca.com",        // URL del servidor principal
      "booksFolder": "C:\\MisLibros",                  // Carpeta donde están tus libros
      "localPort": 3001,                               // Puerto donde corre este servidor
      "pcName": "Mi PC"                                // Nombre para identificar tu PC
    }
  */
} catch (e) {
  console.error('❌ No se encontró config.json');  // Si no existe, error y salir
  process.exit(1);                                  // Código 1 = error
}

// ═══════════════════════════════════════════════════════════════
// CREAR APLICACIÓN EXPRESS
// ═══════════════════════════════════════════════════════════════

const app = express();      // Crear instancia de Express
app.use(cors());            // Habilitar CORS para todas las rutas
app.use(express.json());    // Parsear body de peticiones como JSON

// ═══════════════════════════════════════════════════════════════
// DEFINIR RUTAS DE CARPETAS
// ═══════════════════════════════════════════════════════════════

const BOOKS_FOLDER = config.booksFolder || 'C:\\MisLibros';  // Carpeta raíz
const PDF_FOLDER = path.join(BOOKS_FOLDER, 'pdfs');          // C:\MisLibros\pdfs
const COVERS_FOLDER = path.join(BOOKS_FOLDER, 'covers');     // C:\MisLibros\covers

// ═══════════════════════════════════════════════════════════════
// CREAR CARPETAS SI NO EXISTEN
// ═══════════════════════════════════════════════════════════════

[PDF_FOLDER, COVERS_FOLDER].forEach(folder => {
  if (!fs.existsSync(folder)) {           // Si la carpeta NO existe
    fs.mkdirSync(folder, { recursive: true });  // Crearla (recursive = crear padres también)
  }
});
// Resultado: Se asegura que existan C:\MisLibros\pdfs y C:\MisLibros\covers

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE: VERIFICAR API KEY
// ═══════════════════════════════════════════════════════════════

const verifyKey = (req, res, next) => {
  // Buscar la API key en headers o query params
  const key = req.headers['x-api-key'] || req.query.apiKey;
  
  // Comparar con la key configurada
  if (key !== config.apiKey) {
    return res.status(401).json({ error: 'API key inválida' });  // 401 = No autorizado
  }
  
  next();  // Si es válida, continuar al siguiente middleware/ruta
};
/*
  Ejemplo de uso:
  - Header: x-api-key: MiBiblioteca2024SecretKey_AbCdEfGh
  - O URL: /files?apiKey=MiBiblioteca2024SecretKey_AbCdEfGh
*/

// ═══════════════════════════════════════════════════════════════
// HELPER: LISTAR ARCHIVOS DE UNA CARPETA
// ═══════════════════════════════════════════════════════════════

const listFiles = (folder, extensions) => {
  // Si la carpeta no existe, retornar array vacío
  if (!fs.existsSync(folder)) return [];
  
  return fs.readdirSync(folder)  // Leer todos los archivos de la carpeta
    // Filtrar solo los que tengan las extensiones permitidas
    .filter(f => extensions.some(ext => f.toLowerCase().endsWith(ext)))
    // Mapear a objeto con nombre y tamaño
    .map(f => ({ 
      name: f,                                           // Nombre del archivo
      size: fs.statSync(path.join(folder, f)).size      // Tamaño en bytes
    }));
};
/*
  Ejemplo:
  listFiles('C:\\MisLibros\\pdfs', ['.pdf'])
  Retorna: [
    { name: 'libro1.pdf', size: 1048576 },
    { name: 'libro2.pdf', size: 2097152 }
  ]
*/

// ═══════════════════════════════════════════════════════════════
// HELPER: SERVIR UN ARCHIVO
// ═══════════════════════════════════════════════════════════════

const serveFile = (folder, filename, mime, res) => {
  const filepath = path.join(folder, filename);  // Construir ruta completa
  
  // SEGURIDAD: Verificar que la ruta esté dentro de la carpeta permitida
  // Esto previene ataques de "path traversal" (../../etc/passwd)
  if (!filepath.startsWith(folder) || !fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  
  res.setHeader('Content-Type', mime);        // Establecer tipo MIME
  fs.createReadStream(filepath).pipe(res);    // Enviar archivo como stream
};
/*
  createReadStream: Lee el archivo en pedazos (chunks) en lugar de cargarlo
  todo en memoria. Eficiente para archivos grandes.
  
  pipe(res): Conecta el stream de lectura directamente a la respuesta HTTP
*/

// ═══════════════════════════════════════════════════════════════
// ENDPOINT: HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    name: 'PC Server', 
    time: new Date().toISOString()  // Hora actual en formato ISO
  });
});
// Usado para verificar si el servidor está corriendo

// ═══════════════════════════════════════════════════════════════
// ENDPOINT: LISTAR ARCHIVOS DISPONIBLES
// ═══════════════════════════════════════════════════════════════

app.get('/files', verifyKey, (req, res) => {
  // verifyKey se ejecuta primero (middleware)
  // Si pasa la verificación, ejecuta esta función
  
  try {
    res.json({
      pdfs: listFiles(PDF_FOLDER, ['.pdf']),                           // Lista de PDFs
      covers: listFiles(COVERS_FOLDER, ['.jpg', '.png', '.jpeg', '.webp']),  // Lista de imágenes
      booksFolder: BOOKS_FOLDER                                        // Ruta de la carpeta
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
/*
  Respuesta ejemplo:
  {
    "pdfs": [
      { "name": "don-quijote.pdf", "size": 5242880 },
      { "name": "cien-anos-soledad.pdf", "size": 3145728 }
    ],
    "covers": [
      { "name": "don-quijote.jpg", "size": 102400 },
      { "name": "cien-anos-soledad.png", "size": 81920 }
    ],
    "booksFolder": "C:\\MisLibros"
  }
*/

// ═══════════════════════════════════════════════════════════════
// ENDPOINT: SERVIR PDF
// ═══════════════════════════════════════════════════════════════

app.get('/file/pdf/:filename', verifyKey, (req, res) => {
  // :filename es un parámetro de ruta (ej: /file/pdf/mi-libro.pdf)
  serveFile(PDF_FOLDER, req.params.filename, 'application/pdf', res);
});
// Ejemplo: GET /file/pdf/don-quijote.pdf
// Retorna: El archivo PDF como stream binario

// ═══════════════════════════════════════════════════════════════
// ENDPOINT: SERVIR IMAGEN DE PORTADA
// ═══════════════════════════════════════════════════════════════

app.get('/file/cover/:filename', verifyKey, (req, res) => {
  const ext = path.extname(req.params.filename).toLowerCase();  // Obtener extensión
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';     // Determinar MIME type
  serveFile(COVERS_FOLDER, req.params.filename, mime, res);
});
// Ejemplo: GET /file/cover/don-quijote.jpg
// Retorna: La imagen como stream binario

// ═══════════════════════════════════════════════════════════════
// HELPER: LLAMADAS API AL SERVIDOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

const apiCall = (endpoint, method = 'post', data = {}) => 
  axios({ 
    method,                                              // GET, POST, etc.
    url: `${config.serverUrl}/api/remote/${endpoint}`,  // URL completa
    data,                                                // Body de la petición
    headers: { 'x-api-key': config.apiKey },            // Autenticación
    timeout: method === 'post' ? 10000 : 5000           // Timeout en ms
  }).catch(() => null);  // Si falla, retornar null (no lanzar error)

/*
  Ejemplo de uso:
  apiCall('register', 'post', { url: 'https://xxx.trycloudflare.com' })
  
  Equivale a:
  POST https://tu-biblioteca.com/api/remote/register
  Headers: { x-api-key: MiBiblioteca2024SecretKey_AbCdEfGh }
  Body: { url: 'https://xxx.trycloudflare.com' }
*/

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN: REGISTRAR PC CON EL SERVIDOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

const register = async (url) => {
  const res = await apiCall('register', 'post', { 
    url,                              // URL pública del túnel (cloudflared)
    name: config.pcName || 'Mi PC'    // Nombre del PC
  });
  
  if (res) console.log('✅ Registrado con el servidor principal');
  return !!res;  // Convertir a booleano (true si tuvo éxito)
};

// ═══════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════

const PORT = config.localPort || 3001;           // Puerto (default 3001)
const publicUrl = process.env.TUNNEL_URL;        // URL del túnel (de iniciar.bat)

app.listen(PORT, async () => {
  // Este callback se ejecuta cuando el servidor está listo
  
  console.log('\n========================================');
  console.log('  📚 PC SERVER - BIBLIOTECA VIRTUAL');
  console.log('========================================');
  console.log(`📁 Carpeta: ${BOOKS_FOLDER}`);
  console.log(`🖥️  Local: http://localhost:${PORT}`);
  
  // Si hay URL de túnel (cloudflared)
  if (publicUrl) {
    console.log(`🌐 Público: ${publicUrl}`);
    
    // Registrar con el servidor principal
    if (await register(publicUrl)) {
      // Si el registro fue exitoso, iniciar heartbeat
      setInterval(() => apiCall('heartbeat'), 30000);  // Cada 30 segundos
      console.log('💓 Heartbeat activo');
    }
  }
  
  console.log('\n✅ Servidor corriendo');
  console.log('   Presiona Ctrl+C para detener');
  console.log('========================================');
});

// ═══════════════════════════════════════════════════════════════
// MANEJO DE CIERRE LIMPIO
// ═══════════════════════════════════════════════════════════════

const cleanup = async () => {
  await apiCall('disconnect');  // Notificar al servidor que nos desconectamos
  process.exit(0);              // Salir limpiamente
};

process.on('SIGINT', cleanup);   // Ctrl+C
process.on('SIGTERM', cleanup);  // kill command
📄 ROUTES/REMOTE.JS - EXPLICACIÓN LÍNEA POR LÍNEA
// ═══════════════════════════════════════════════════════════════
// IMPORTACIONES
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();        // Crear router de Express
const axios = require('axios');         // Para hacer peticiones HTTP al PC remoto
const RemoteSource = require('../models/RemoteSource');  // Modelo de MongoDB
const { adminOnly } = require('../middleware/auth');     // Middleware de admin

/*
  RemoteSource es el modelo que guarda la info del PC conectado:
  {
    name: "Mi PC",
    url: "https://xxx.trycloudflare.com",
    apiKey: "MiBiblioteca2024SecretKey_AbCdEfGh",
    isOnline: true,
    lastSeen: Date
  }
*/

// ═══════════════════════════════════════════════════════════════
// OBTENER API KEY DEL ENTORNO
// ═══════════════════════════════════════════════════════════════

const API_KEY = () => process.env.REMOTE_API_KEY;
// Se obtiene de .env: REMOTE_API_KEY=MiBiblioteca2024SecretKey_AbCdEfGh

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE: VERIFICAR API KEY (para endpoints del PC)
// ═══════════════════════════════════════════════════════════════

const verifyKey = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  
  if (key !== API_KEY()) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  
  next();
};
// Este middleware verifica que el PC que llama tenga la clave correcta

// ═══════════════════════════════════════════════════════════════
// HELPER: OBTENER FUENTE REMOTA DE LA BASE DE DATOS
// ═══════════════════════════════════════════════════════════════

const getSource = (online = false) => RemoteSource.findOne({ 
  apiKey: API_KEY(),                        // Buscar por API key
  ...(online && { isOnline: true })         // Opcionalmente, solo si está online
});
/*
  getSource() → Busca cualquier PC con esa API key
  getSource(true) → Busca solo si está online
  
  Retorna documento de MongoDB o null si no existe
*/

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// ENDPOINTS PARA EL PC REMOTO (llamados desde pc-server)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// POST /api/remote/register - REGISTRAR PC
// ───────────────────────────────────────────────────────────────

router.post('/register', verifyKey, async (req, res) => {
  try {
    const { url, name } = req.body;  // Extraer URL y nombre del body
    
    // Validar que venga la URL
    if (!url) {
      return res.status(400).json({ error: 'URL requerida' });
    }

    // Buscar si ya existe un registro con esta API key
    let source = await getSource();
    
    if (source) {
      // Si existe, ACTUALIZAR
      Object.assign(source, { 
        url,                          // Nueva URL del túnel
        name: name || source.name,    // Nuevo nombre (o mantener el anterior)
        isOnline: true,               // Marcar como online
        lastSeen: new Date()          // Actualizar última vez visto
      });
      await source.save();
    } else {
      // Si NO existe, CREAR nuevo
      source = await RemoteSource.create({ 
        url, 
        name: name || 'Mi PC', 
        apiKey: API_KEY(), 
        isOnline: true, 
        lastSeen: new Date() 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'PC registrado', 
      source: { name: source.name, url: source.url } 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/*
  FLUJO:
  1. PC-Server inicia y obtiene URL de cloudflared
  2. PC-Server llama: POST /api/remote/register
     Body: { url: "https://xxx.trycloudflare.com", name: "Mi PC" }
  3. Servidor guarda/actualiza en MongoDB
  4. Ahora el servidor sabe cómo contactar al PC
*/

// ───────────────────────────────────────────────────────────────
// POST /api/remote/heartbeat - MANTENER CONEXIÓN ACTIVA
// ───────────────────────────────────────────────────────────────

router.post('/heartbeat', verifyKey, async (req, res) => {
  try {
    const source = await getSource();
    
    if (source) {
      source.lastSeen = new Date();  // Actualizar timestamp
      source.isOnline = true;        // Confirmar que sigue online
      await source.save();
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/*
  FLUJO:
  1. PC-Server llama cada 30 segundos: POST /api/remote/heartbeat
  2. Servidor actualiza lastSeen en MongoDB
  3. Si el PC se desconecta, los heartbeats paran
  4. El servidor detecta que lastSeen > 60 segundos = offline
*/

// ───────────────────────────────────────────────────────────────
// POST /api/remote/disconnect - DESCONEXIÓN LIMPIA
// ───────────────────────────────────────────────────────────────

router.post('/disconnect', verifyKey, async (req, res) => {
  try {
    const source = await getSource();
    
    if (source) {
      source.isOnline = false;  // Marcar como offline
      await source.save();
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/*
  FLUJO:
  1. Usuario presiona Ctrl+C en pc-server
  2. pc-server llama: POST /api/remote/disconnect
  3. Servidor marca isOnline = false en MongoDB
*/

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// ENDPOINTS PARA EL ADMIN (llamados desde el dashboard)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// GET /api/remote/status - VER ESTADO DEL PC
// ───────────────────────────────────────────────────────────────

router.get('/status', adminOnly, async (req, res) => {
  // adminOnly: Solo admins pueden ver esto
  
  try {
    const source = await getSource();
    
    // Si no hay PC configurado
    if (!source) {
      return res.json({ connected: false, message: 'No hay PC configurado' });
    }

    // Verificar si está realmente online
    // Si lastSeen fue hace más de 60 segundos, marcar como offline
    if (source.lastSeen && Date.now() - source.lastSeen.getTime() >= 60000) {
      source.isOnline = false;
      await source.save();
    }

    res.json({ 
      connected: source.isOnline,    // true/false
      name: source.name,             // "Mi PC"
      url: source.url,               // URL del túnel
      lastSeen: source.lastSeen      // Última conexión
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/*
  Respuesta ejemplo (online):
  {
    "connected": true,
    "name": "Mi PC",
    "url": "https://xxx.trycloudflare.com",
    "lastSeen": "2024-01-15T10:30:00.000Z"
  }
  
  Respuesta ejemplo (offline):
  {
    "connected": false,
    "name": "Mi PC",
    "url": "https://xxx.trycloudflare.com",
    "lastSeen": "2024-01-15T09:00:00.000Z"
  }
*/

// ───────────────────────────────────────────────────────────────
// GET /api/remote/files - LISTAR ARCHIVOS DEL PC
// ───────────────────────────────────────────────────────────────

router.get('/files', adminOnly, async (req, res) => {
  try {
    // Buscar PC que esté online
    const source = await getSource(true);  // true = solo online
    
    if (!source) {
      return res.status(404).json({ error: 'PC no conectado' });
    }

    // Hacer petición al PC remoto
    const { data } = await axios.get(`${source.url}/files`, {
      headers: { 'x-api-key': API_KEY() },  // Autenticación
      timeout: 10000                         // 10 segundos máximo
    });
    
    res.json(data);  // Reenviar respuesta del PC
  } catch (e) {
    res.status(500).json({ error: 'No se pudo conectar con el PC' });
  }
});

/*
  FLUJO:
  1. Admin abre dashboard → Tab "PC Remoto"
  2. Frontend llama: GET /api/remote/files
  3. Servidor busca URL del PC en MongoDB
  4. Servidor llama al PC: GET https://xxx.trycloudflare.com/files
  5. PC responde con lista de archivos
  6. Servidor reenvía la respuesta al frontend
  
  El servidor actúa como PROXY entre el admin y el PC
*/

// ───────────────────────────────────────────────────────────────
// GET /api/remote/file/:type/:filename - PROXY DE ARCHIVOS
// ───────────────────────────────────────────────────────────────

router.get('/file/:type/:filename', async (req, res) => {
  // NOTA: Este endpoint NO tiene adminOnly
  // Porque los usuarios normales también leen libros
  
  try {
    const { type, filename } = req.params;
    
    // Validar tipo (solo pdf o cover)
    if (!['pdf', 'cover'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }

    // Buscar PC online
    const source = await getSource(true);
    
    if (!source) {
      return res.status(404).json({ error: 'PC no conectado' });
    }

    // Hacer petición al PC remoto
    const response = await axios.get(`${source.url}/file/${type}/${filename}`, {
      headers: { 'x-api-key': API_KEY() },
      responseType: 'stream',    // MUY IMPORTANTE: recibir como stream
      timeout: 30000             // 30 segundos (PDFs grandes)
    });

    // Copiar Content-Type del PC
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    
    // PIPE: Conectar stream del PC directamente a la respuesta
    response.data.pipe(res);
    
  } catch (e) {
    res.status(500).json({ error: 'No se pudo obtener el archivo' });
  }
});

/*
  FLUJO PARA LEER UN LIBRO:
  
  1. En MongoDB, el libro tiene:
     { pdfUrl: "remote:don-quijote.pdf" }
  
  2. routes/books.js detecta el prefijo "remote:" y lo transforma:
     pdfUrl: "/api/remote/file/pdf/don-quijote.pdf"
  
  3. Usuario abre el lector, el iframe carga:
     GET /api/remote/file/pdf/don-quijote.pdf
  
  4. Este endpoint:
     - Busca URL del PC en MongoDB
     - Llama: GET https://xxx.trycloudflare.com/file/pdf/don-quijote.pdf
     - El PC lee el archivo de C:\MisLibros\pdfs\don-quijote.pdf
     - El PC envía el archivo como stream
     - Este servidor lo reenvía al usuario
  
  5. El usuario ve el PDF en su navegador
  
  
  DIAGRAMA DEL FLUJO:
  
  Usuario          Servidor              PC Local              Disco
    │                 │                     │                    │
    │ GET /api/       │                     │                    │
    │ remote/file/    │                     │                    │
    │ pdf/libro.pdf   │                     │                    │
    │────────────────►│                     │                    │
    │                 │ GET /file/pdf/      │                    │
    │                 │ libro.pdf           │                    │
    │                 │────────────────────►│                    │
    │                 │                     │ Leer archivo       │
    │                 │                     │───────────────────►│
    │                 │                     │◄───────────────────│
    │                 │                     │ Stream de bytes    │
    │                 │◄────────────────────│                    │
    │◄────────────────│ Stream de bytes     │                    │
    │                 │                     │                    │
    │ PDF renderizado │                     │                    │
    │ en navegador    │                     │                    │
*/

module.exports = router;
🔄 CÓMO SE TRANSFORMAN LAS URLs "remote:"
En routes/books.js hay una función que transforma las URLs:

function processUrls(book) {
  const obj = book.toObject ? book.toObject() : { ...book };
  
  // Si coverUrl empieza con "remote:"
  if (obj.coverUrl?.startsWith('remote:')) {
    // "remote:portada.jpg" → "/api/remote/file/cover/portada.jpg"
    obj.coverUrl = `/api/remote/file/cover/${encodeURIComponent(obj.coverUrl.slice(7))}`;
    obj.isRemoteCover = true;
  }
  
  // Si pdfUrl empieza con "remote:"
  if (obj.pdfUrl?.startsWith('remote:')) {
    // "remote:libro.pdf" → "/api/remote/file/pdf/libro.pdf"
    obj.pdfUrl = `/api/remote/file/pdf/${encodeURIComponent(obj.pdfUrl.slice(7))}`;
    obj.isRemotePdf = true;
  }
  
  return obj;
}
Ejemplo completo:

// En MongoDB:
{
  title: "Don Quijote",
  coverUrl: "remote:don-quijote.jpg",
  pdfUrl: "remote:don-quijote.pdf"
}

// Después de processUrls():
{
  title: "Don Quijote",
  coverUrl: "/api/remote/file/cover/don-quijote.jpg",
  pdfUrl: "/api/remote/file/pdf/don-quijote.pdf",
  isRemoteCover: true,
  isRemotePdf: true
}

// En el HTML del usuario:
<img src="/api/remote/file/cover/don-quijote.jpg">
<iframe src="/api/remote/file/pdf/don-quijote.pdf">
📊 RESUMEN VISUAL DEL SISTEMA
┌────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO COMPLETO                                    │
└────────────────────────────────────────────────────────────────────────────┘

1️⃣ INICIO DEL PC-SERVER
   ┌─────────────┐     POST /register      ┌─────────────┐     Guardar
   │  pc-server  │ ──────────────────────► │  Servidor   │ ──────────► MongoDB
   │  (tu PC)    │  {url, name, apiKey}    │  Principal  │
   └─────────────┘                         └─────────────┘

2️⃣ HEARTBEAT (cada 30s)
   ┌─────────────┐     POST /heartbeat     ┌─────────────┐     Actualizar
   │  pc-server  │ ──────────────────────► │  Servidor   │ ──────────► MongoDB
   └─────────────┘  (mantener vivo)        └─────────────┘     lastSeen

3️⃣ ADMIN VE ARCHIVOS
   ┌─────────────┐  GET /api/remote/files  ┌─────────────┐  GET /files   ┌─────────────┐
   │   Admin     │ ──────────────────────► │  Servidor   │ ────────────► │  pc-server  │
   │  (browser)  │ ◄────────────────────── │  Principal  │ ◄──────────── │  (tu PC)    │
   └─────────────┘    Lista de archivos    └─────────────┘  {pdfs,covers}└─────────────┘

4️⃣ USUARIO LEE LIBRO
   ┌─────────────┐  GET /api/remote/file/  ┌─────────────┐  GET /file/   ┌─────────────┐
   │  Usuario    │  pdf/libro.pdf          │  Servidor   │  pdf/libro    │  pc-server  │
   │  (browser)  │ ──────────────────────► │  (PROXY)    │ ────────────► │  (tu PC)    │
   └─────────────┘                         └─────────────┘               └──────┬──────┘
         ▲                                       │                              │
         │           Stream de bytes             │         Leer archivo         ▼
         └───────────────────────────────────────┴─────────────────────► C:\MisLibros\
                                                                         pdfs\libro.pdf