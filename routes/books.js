const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const AccessLog = require('../models/AccessLog');
const { adminOnly } = require('../middleware/auth');

// Helper: Procesar URLs remotas
function processUrls(book) {
  const obj = book.toObject ? book.toObject() : { ...book };
  if (obj.coverUrl?.startsWith('remote:')) {
    obj.coverUrl = `/api/remote/file/cover/${encodeURIComponent(obj.coverUrl.slice(7))}`;
    obj.isRemoteCover = true;
  }
  if (obj.pdfUrl?.startsWith('remote:')) {
    obj.pdfUrl = `/api/remote/file/pdf/${encodeURIComponent(obj.pdfUrl.slice(7))}`;
    obj.isRemotePdf = true;
  }
  return obj;
}

// Proyección para listados (campos mínimos necesarios)
const LIST_PROJECTION = { title: 1, author: 1, coverUrl: 1, categories: 1, views: 1, createdAt: 1 };

// GET todos los libros
router.get('/', async (req, res) => {
  try {
    const { search, category, sort = 'createdAt' } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.categories = category;

    const books = await Book.find(query, LIST_PROJECTION)
      .sort({ [sort]: sort === 'title' ? 1 : -1 })
      .lean();
    res.json(books.map(processUrls));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET destacados
router.get('/featured', async (req, res) => {
  try {
    const books = await Book.find({}, LIST_PROJECTION)
      .sort({ views: -1 })
      .limit(10)
      .lean();
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(books.map(processUrls));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET recientes
router.get('/recent', async (req, res) => {
  try {
    const books = await Book.find({}, LIST_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(books.map(processUrls));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET un libro
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro no encontrado' });
    res.json(processUrls(book));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST crear libro (admin)
router.post('/', adminOnly, async (req, res) => {
  try {
    const book = await new Book(req.body).save();
    res.json(book);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT actualizar libro (admin)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(book);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE eliminar libro (admin)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST registrar lectura
router.post('/:id/read', async (req, res) => {
  try {
    const bookId = req.params.id;
    await Book.findByIdAndUpdate(bookId, { $inc: { views: 1 } });

    if (req.user) return res.json({ allowed: true, message: 'Acceso como usuario registrado' });

    const identifier = req.ip;
    const guestReads = await AccessLog.countDocuments({ identifier });
    
    if (guestReads >= 1) {
      const existing = await AccessLog.findOne({ identifier, bookId });
      if (existing) return res.json({ allowed: true, message: 'Continuar leyendo' });
      return res.json({ allowed: false, message: 'Límite alcanzado. Regístrate para leer más.' });
    }

    await AccessLog.create({ identifier, bookId });
    res.json({ allowed: true, message: 'Acceso concedido' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;