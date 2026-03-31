const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Campaign = require('../models/Campaign');
const { getStatus } = require('../services/whatsappService');

// Configure Multer for Campaign Media (up to 64MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'campaigns');
    // Ensure directory exists
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 64 * 1024 * 1024 } // 64 MB Limit
});

// GET /api/campaigns - List campaigns for current owner
router.get('/', async (req, res) => {
    try {
        const { phoneNumber } = getStatus();
        if (!phoneNumber) return res.status(401).json({ error: 'WhatsApp bağlı deyil' });
        const campaigns = await Campaign.find({ owner: phoneNumber }).sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: 'Kampaniyaları yükləmək mümkün olmadı', details: error.message });
    }
});

// POST /api/campaigns - Create a new scheduled campaign
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { name, messageBody, scheduledAt, audience } = req.body;
        
        if (!name || !messageBody || !scheduledAt || !audience) {
            return res.status(400).json({ error: 'Ad, Mesaj, Vaxt və Auditoriya tələb olunur.' });
        }

        let parsedAudience = [];
        try {
            parsedAudience = JSON.parse(audience);
            if (!Array.isArray(parsedAudience)) throw new Error('Format');
        } catch (e) {
            return res.status(400).json({ error: 'Auditoriya massiv formatında (JSON string) olmalıdır.' });
        }

        const { phoneNumber } = getStatus();
        if (!phoneNumber) return res.status(401).json({ error: 'WhatsApp bağlı deyil' });

        const campaignData = {
            name,
            messageBody,
            scheduledAt: new Date(scheduledAt),
            audience: parsedAudience,
            owner: phoneNumber,
            status: 'pending',
            progress: {
                total: parsedAudience.length,
                sent: 0,
                failed: 0
            }
        };

        if (req.file) {
            campaignData.hasMedia = true;
            campaignData.mediaPath = req.file.path;
            campaignData.mediaOriginalName = req.file.originalname;
        }

        const newCampaign = new Campaign(campaignData);
        await newCampaign.save();

        res.status(201).json({ success: true, campaign: newCampaign });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Kampaniya yaratmaq mümkün olmadı', details: error.message });
    }
});

// DELETE /api/campaigns/:id - Delete a campaign
router.delete('/:id', async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ error: 'Kampaniya tapılmadı' });
        
        if (campaign.hasMedia && campaign.mediaPath && fs.existsSync(campaign.mediaPath)) {
            fs.unlinkSync(campaign.mediaPath);
        }
        await Campaign.findByIdAndDelete(req.params.id);
        
        res.json({ success: true, message: 'Kampaniya silindi' });
    } catch (error) {
        res.status(500).json({ error: 'Kampaniyanı silmək mümkün olmadı' });
    }
});

// PUT /api/campaigns/:id - Update a pending campaign
router.put('/:id', upload.single('file'), async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ error: 'Kampaniya tapılmadı' });
        if (campaign.status !== 'pending') {
            return res.status(400).json({ error: 'Yalnız gözləyən kampaniyalar redaktə edilə bilər.' });
        }

        const { name, messageBody, scheduledAt, audience } = req.body;

        if (name) campaign.name = name;
        if (messageBody) campaign.messageBody = messageBody;
        if (scheduledAt) campaign.scheduledAt = new Date(scheduledAt);

        if (audience) {
            let parsedAudience = JSON.parse(audience);
            if (!Array.isArray(parsedAudience)) throw new Error('Format');
            campaign.audience = parsedAudience;
            campaign.progress = { total: parsedAudience.length, sent: 0, failed: 0 };
        }

        if (req.body.removeMedia === 'true' && !req.file) {
            // User wants to remove existing media without replacing
            if (campaign.hasMedia && campaign.mediaPath && fs.existsSync(campaign.mediaPath)) {
                fs.unlinkSync(campaign.mediaPath);
            }
            campaign.hasMedia = false;
            campaign.mediaPath = undefined;
            campaign.mediaOriginalName = undefined;
        }

        if (req.file) {
            // Delete old media if exists
            if (campaign.hasMedia && campaign.mediaPath && fs.existsSync(campaign.mediaPath)) {
                fs.unlinkSync(campaign.mediaPath);
            }
            campaign.hasMedia = true;
            campaign.mediaPath = req.file.path;
            campaign.mediaOriginalName = req.file.originalname;
        }

        await campaign.save();
        res.json({ success: true, campaign });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Kampaniyanı yeniləmək mümkün olmadı', details: error.message });
    }
});

module.exports = router;
