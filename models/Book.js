const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  description: { type: String, default: '' },
  categories: [String],
  tags: [String],
  coverUrl: { type: String, default: null },
  pdfUrl: { type: String, default: null },
  content: { type: String, default: null },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', bookSchema);
