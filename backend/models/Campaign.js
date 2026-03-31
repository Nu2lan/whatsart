const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  messageBody: { type: String, required: true },
  status: { type: String, enum: ['draft', 'pending', 'processing', 'completed', 'failed'], default: 'pending' },
  audience: [{ type: String }],
  scheduledAt: { type: Date, required: true },
  owner: { type: String, required: true }, // Owner's WhatsApp phone
  hasMedia: { type: Boolean, default: false },
  mediaPath: { type: String, required: false },
  mediaOriginalName: { type: String, required: false },
  progress: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Campaign', campaignSchema);
