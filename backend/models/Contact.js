const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  owner: { type: String, required: true }, // Owner's WhatsApp phone (e.g. "994501234567@c.us")
  createdAt: { type: Date, default: Date.now }
});

// Compound index: same phone can exist under different owners
contactSchema.index({ phone: 1, owner: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);
