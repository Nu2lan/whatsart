const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  text: { type: String, required: true },
  isBotReply: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false },
  owner: { type: String, required: true }, // Owner's WhatsApp phone
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
