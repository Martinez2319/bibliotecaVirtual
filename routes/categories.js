const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { adminOnly } = require('../middleware/auth');

// GET categorías
router.get('/', async (req, res) => {
  try {
    res.json(await Category.find());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST crear categoría (admin)
router.post('/', adminOnly, async (req, res) => {
  try {
    const category = await new Category(req.body).save();
    res.json(category);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT actualizar categoría (admin)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(category);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE eliminar categoría (admin)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;