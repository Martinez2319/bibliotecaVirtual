const mongoose = require('mongoose');

const remoteSourceSchema = new mongoose.Schema({
  name: { type: String, default: 'Mi PC' },
  url: { type: String, required: true },
  apiKey: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RemoteSource', remoteSourceSchema);