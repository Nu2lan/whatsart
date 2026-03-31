const mongoose = require('mongoose');

// WhatsApp-based user model — no email or password needed.
// Authentication is handled entirely by WhatsApp QR scan.
const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true }, // e.g. "994501234567@c.us"
  name:        { type: String, default: '' },                  // WhatsApp pushname
  lastLogin:   { type: Date, default: Date.now },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
