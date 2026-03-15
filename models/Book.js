const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  author: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  categories: { type: [String], index: true },
  tags: [String],
  coverUrl: { type: String, default: null },
  pdfUrl: { type: String, default: null },
  content: { type: String, default: null },
  views: { type: Number, default: 0, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Índice compuesto para búsqueda
bookSchema.index({ title: 'text', author: 'text' });

module.exports = mongoose.model('Book', bookSchema);