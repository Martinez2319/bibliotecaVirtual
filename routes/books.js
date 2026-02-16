const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const AccessLog = require('../models/AccessLog');

// Obtener todos los libros
router.get('/', async (req, res) => {
  try {
    const { search, category, sort = 'createdAt' } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.categories = category;

    const books = await Book.find(query).sort({ [sort]: sort === 'title' ? 1 : -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Libros destacados
router.get('/featured', async (req, res) => {
  try {
    const books = await Book.find().sort({ views: -1 }).limit(10);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Libros recientes
router.get('/recent', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 }).limit(10);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un libro
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro no encontrado' });
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear libro (admin)
router.post('/', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const book = new Book(req.body);
    await book.save();
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar libro (admin)
router.put('/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar libro (admin)
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    await Book.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar lectura (control invitados)
router.post('/:id/read', async (req, res) => {
  try {
    const bookId = req.params.id;
    await Book.findByIdAndUpdate(bookId, { $inc: { views: 1 } });

    if (req.user) {
      return res.json({ allowed: true, message: 'Acceso como usuario registrado' });
    }

    const identifier = req.ip;
    const guestReads = await AccessLog.countDocuments({ identifier });
    
    if (guestReads >= 1) {
      const existing = await AccessLog.findOne({ identifier, bookId });
      if (existing) return res.json({ allowed: true, message: 'Continuar leyendo' });
      return res.json({ allowed: false, message: 'Límite alcanzado. Regístrate para leer más.' });
    }

    await AccessLog.create({ identifier, bookId });
    res.json({ allowed: true, message: 'Acceso concedido' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
