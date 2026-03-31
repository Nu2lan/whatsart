const express = require('express');
const router = express.Router();
const { sendBulkMessage, initializeWhatsApp, getStatus, statusEmitter, getDeviceContacts, deleteChatHistory, markChatAsRead, getDeviceChats, getDeviceMessages, sendDeviceMessage, getMessageMedia, getProfilePic, logoutWhatsApp } = require('../services/whatsappService');
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const upload = multer({ 
    dest: path.join(__dirname, '../uploads/'),
    limits: { fileSize: 16 * 1024 * 1024 } // 16MB limit
});

router.post('/send-bulk', async (req, res) => {
    try {
        const { messageBody, contactIds } = req.body;

        if (!messageBody || !contactIds || contactIds.length === 0) {
            return res.status(400).json({ error: 'Message payload or contacts missing' });
        }

        const { phoneNumber } = getStatus();
        if (!phoneNumber) return res.status(401).json({ error: 'WhatsApp bağlı deyil' });

        // Fetch actual contacts from DB
        const dbContacts = await Contact.find({ _id: { $in: contactIds.filter(id => !id.startsWith('msg_')) } });
        
        // Handle message-only senders
        const msgContacts = contactIds
            .filter(id => id.startsWith('msg_'))
            .map(id => ({ phone: id.replace('msg_', '').replace('@c.us', ''), name: '' }));

        const allContacts = [...dbContacts, ...msgContacts];

        // Create campaign record
        const campaign = new Campaign({
            messageBody,
            status: 'sending',
            audience: contactIds,
            owner: phoneNumber
        });
        await campaign.save();

        // Start sending in background
        sendBulkMessage(allContacts, messageBody, phoneNumber)
            .then(async (results) => {
                campaign.status = 'completed';
                campaign.sentTime = new Date();
                await campaign.save();
            })
            .catch(async (err) => {
                campaign.status = 'failed';
                await campaign.save();
            });

        return res.status(200).json({ message: 'Campaign started successfully', campaignId: campaign._id });
    } catch (error) {
        console.error('Error starting campaign:', error);
        return res.status(500).json({ error: 'Server error starting campaign' });
    }
});

router.get('/campaigns', async (req, res) => {
    try {
        const { phoneNumber } = getStatus();
        const filter = phoneNumber ? { owner: phoneNumber } : {};
        const campaigns = await Campaign.find(filter).sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

router.get('/contacts', async (req, res) => {
    try {
        const { phoneNumber } = getStatus();
        if (!phoneNumber) return res.status(401).json({ error: 'WhatsApp bağlı deyil' });
        const { includeMessages } = req.query;
        
        const dbContacts = await Contact.find({ owner: phoneNumber }).sort({ createdAt: -1 }).lean();
        
        if (includeMessages !== 'true') return res.json(dbContacts);

        const contactPhones = new Set(dbContacts.map(c => c.phone));
        const messageSenders = await Message.distinct('sender', { owner: phoneNumber });
        
        // Single aggregation: get last message timestamp for each contact (as sender OR receiver)
        const lastBySender = await Message.aggregate([
            { $match: { owner: phoneNumber } },
            { $group: { _id: '$sender', ts: { $max: '$timestamp' } } }
        ]);
        const lastByReceiver = await Message.aggregate([
            { $match: { owner: phoneNumber } },
            { $group: { _id: '$receiver', ts: { $max: '$timestamp' } } }
        ]);
        const lastMessageMap = {};
        for (const item of [...lastBySender, ...lastByReceiver]) {
            if (!item._id) continue;
            const phone = item._id.replace('@c.us', '');
            const ts = new Date(item.ts).getTime();
            if (!lastMessageMap[phone] || ts > lastMessageMap[phone]) {
                lastMessageMap[phone] = ts;
            }
        }

        const enrichedDbContacts = dbContacts.map(c => ({
            ...c,
            lastMessageAt: lastMessageMap[c.phone] ? new Date(lastMessageMap[c.phone]) : c.createdAt
        }));

        const nonContactSenders = messageSenders
            .filter(s => s && s.endsWith('@c.us') && !contactPhones.has(s.replace('@c.us', '')))
            .map(s => {
                const phone = s.replace('@c.us', '');
                return {
                    _id: 'msg_' + s,
                    phone,
                    name: '',
                    owner: phoneNumber,
                    isFromMessages: true,
                    lastMessageAt: lastMessageMap[phone] || new Date()
                };
            });
        
        res.json([...enrichedDbContacts, ...nonContactSenders]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

router.post('/contacts', async (req, res) => {
    try {
        const { phoneNumber } = getStatus();
        if (!phoneNumber) return res.status(401).json({ error: 'WhatsApp bağlı deyil' });
        const { name, phone } = req.body;
        const newContact = new Contact({ name, phone, owner: phoneNumber });
        await newContact.save();
        res.status(201).json(newContact);
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: 'Bu nömrə artıq siyahıda mövcuddur.' });
        res.status(500).json({ error: 'Sistem xətası' });
    }
});

router.put('/contacts/:id', async (req, res) => {
    try {
        const updatedContact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedContact);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.delete('/contacts/:id', async (req, res) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.post('/sync-contacts', async (req, res) => {
    try {
        const { phoneNumber } = getStatus();
        const deviceContacts = await getDeviceContacts();
        let addedCount = 0;
        let updatedCount = 0;
        for (const c of deviceContacts.filter(c => c.id.server === 'c.us')) {
            const phone = c.number;
            if (!phone || phone === '0') continue;
            try {
                const result = await Contact.updateOne({ phone, owner: phoneNumber }, { $set: { name: c.name, phone, owner: phoneNumber } }, { upsert: true });
                if (result.upsertedCount > 0) addedCount++;
                else if (result.modifiedCount > 0) updatedCount++;
            } catch (e) {}
        }
        res.json({ message: `Sync completed: ${addedCount} added, ${updatedCount} updated` });
    } catch (error) {
        res.status(500).json({ error: 'Sync failed' });
    }
});

router.get('/messages', async (req, res) => {
    try {
        const { phoneNumber } = getStatus();
        if (!phoneNumber) return res.status(401).json({ error: 'WhatsApp bağlı deyil' });
        const messages = await Message.find({ owner: phoneNumber }).sort({ timestamp: -1 }).limit(100);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.get('/device-chats', async (req, res) => {
    try {
        const chats = await getDeviceChats();
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/device-messages/:phone', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const msgs = await getDeviceMessages(req.params.phone, limit);
        res.json(msgs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/device-messages/:phone', async (req, res) => {
    try {
        await sendDeviceMessage(req.params.phone, req.body.text, req.body.replyToId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/device-messages/:phone/media', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error('File missing');
        const { sendDeviceMediaMessage } = require('../services/whatsappService');
        await sendDeviceMediaMessage(req.params.phone, req.file.path, req.body.caption, req.body.replyToId);
        fs.unlinkSync(req.file.path);
        res.json({ success: true });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/messages/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const { phoneNumber } = getStatus();
        await Message.deleteMany({ owner: phoneNumber, $or: [{ sender: new RegExp(phone) }, { receiver: new RegExp(phone) }] });
        await deleteChatHistory(phone);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

router.post('/enhance-message', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Mətn daxil edilməyib.' });

        const { enhanceChatMessage } = require('../services/aiService');
        const enhancedText = await enhanceChatMessage(text);
        res.json({ success: true, text: enhancedText });
    } catch (error) {
        const { log } = require('../services/logger');
        log('API ENHANCE ERROR', `${error.message}\n${error.stack}`);
        res.status(500).json({ error: error.message || 'Süni intellekt hazırda işləmir' });
    }
});

router.put('/messages/:phone/read', async (req, res) => {
    try {
        const { phone } = req.params;
        const { phoneNumber } = getStatus();
        await Message.updateMany({ owner: phoneNumber, sender: { $regex: new RegExp(phone) }, isRead: { $ne: true } }, { $set: { isRead: true } });
        await markChatAsRead(phone);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Mark as read failed' });
    }
});

router.get('/media/:msgId', async (req, res) => {
    try {
        const media = await getMessageMedia(req.params.msgId);
        if (!media) return res.status(404).send('Not found');
        res.set('Content-Type', media.mimetype);
        res.send(Buffer.from(media.data, 'base64'));
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get('/profile-pic/:phone', async (req, res) => {
    try {
        const url = await getProfilePic(req.params.phone);
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.get('/status-stream', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' });
    res.write(`data: ${JSON.stringify({ type: 'init', ...getStatus() })}\n\n`);
    
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20000);
    
    const onStatusChange = (data) => res.write(`data: ${JSON.stringify({ type: 'status', ...data })}\n\n`);
    const onCampaignUpdate = (data) => res.write(`data: ${JSON.stringify({ type: 'campaign', campaign: data })}\n\n`);
    
    statusEmitter.on('statusChange', onStatusChange);
    statusEmitter.on('campaignUpdate', onCampaignUpdate);
    
    req.on('close', () => { 
        clearInterval(heartbeat); 
        statusEmitter.off('statusChange', onStatusChange); 
        statusEmitter.off('campaignUpdate', onCampaignUpdate);
    });
});

router.get('/status', (req, res) => {
    try { res.json(getStatus()); } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/stats', async (req, res) => {
    try {
        const { phoneNumber } = getStatus();
        const filter = phoneNumber ? { owner: phoneNumber } : {};
        res.json({ 
            receivedMessages: await Message.countDocuments({ ...filter, isBotReply: false }), 
            campaigns: await Campaign.countDocuments(filter) 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.get('/activities', async (req, res) => {
    try {
        const { phoneNumber } = getStatus();
        if (!phoneNumber) return res.json([]);
        
        const filter = { owner: phoneNumber };
        
        // Last 5 messages (received)
        const messages = await Message.find({ ...filter, isBotReply: false })
            .sort({ timestamp: -1 })
            .limit(5);
            
        // Last 5 campaigns
        const campaigns = await Campaign.find(filter)
            .sort({ createdAt: -1 })
            .limit(5);
            
        // Transform into a unified format
        const activities = [
            ...messages.map(m => ({
                id: m._id,
                type: 'message',
                title: 'Yeni mesaj alındı',
                description: `${m.sender.split('@')[0]} nömrəsindən: "${m.text.slice(0, 30)}${m.text.length > 30 ? '...' : ''}"`,
                timestamp: m.timestamp
            })),
            ...campaigns.map(c => ({
                id: c._id,
                type: 'campaign',
                title: 'Kampaniya statusu',
                description: `"${c.name}" adlı toplu mesaj`,
                status: c.status,
                timestamp: c.createdAt
            }))
        ];
        
        // Sort by time descending
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(activities.slice(0, 8)); // Return top 8
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.post('/logout', async (req, res) => {
    try { res.json(await logoutWhatsApp()); } catch (error) { res.status(500).json({ error: 'Logout error' }); }
});

module.exports = router;
