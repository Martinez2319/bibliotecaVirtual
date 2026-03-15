const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { adminOnly } = require('../middleware/auth');

// GET usuarios (admin)
router.get('/', adminOnly, async (req, res) => {
  try {
    res.json(await User.find().select('-passwordHash'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT actualizar usuario (admin)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, email, role }, { new: true }).select('-passwordHash');
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE eliminar usuario (admin)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;