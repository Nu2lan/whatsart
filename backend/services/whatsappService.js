const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');
const { generateBotReply } = require('./aiService');
const SessionManager = require('./SessionManager');
const Message = require('../models/Message');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');

const statusEmitter = new EventEmitter();

let client;
let isReady = false;
let currentQR = '';
let wStatus = 'DISCONNECTED';
let currentPhoneNumber = '';
let currentUserName = '';

// Push status change to all SSE listeners instantly
const broadcastStatus = () => {
    statusEmitter.emit('statusChange', {
        status: wStatus,
        qr: currentQR,
        phoneNumber: currentPhoneNumber,
        userName: currentUserName
    });
};

const broadcastCampaignUpdate = (campaign) => {
    statusEmitter.emit('campaignUpdate', campaign);
};

let initializationLock = false;
const initializeWhatsApp = async () => {
    if (initializationLock) return;
    initializationLock = true;
    try {
        // Wait for mongoose connection to be ready
        if (mongoose.connection.readyState !== 1) {
            await new Promise((resolve) => {
                mongoose.connection.once('connected', resolve);
                // If already connecting, also handle open state
                if (mongoose.connection.readyState === 1) resolve();
            });
        }

        const store = new MongoStore({ mongoose });

        client = new Client({
            authStrategy: new RemoteAuth({
                store,
                backupSyncIntervalMs: 300000, // Sync session to MongoDB every 5 minutes
            }),
            puppeteer: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        wStatus = 'INITIALIZING';
        broadcastStatus();

        // Detect QR scan instantly via page navigation (fires before 'authenticated')
        let navigationListenerSet = false;
        const setupNavigationListener = () => {
            if (navigationListenerSet) return;
            try {
                if (client.pupPage) {
                    navigationListenerSet = true;
                    client.pupPage.on('framenavigated', () => {
                        if (wStatus === 'WAITING_FOR_SCAN') {
                            console.log('QR Scanned! (page navigated)');
                            wStatus = 'AUTHENTICATING';
                            currentQR = '';
                            broadcastStatus();
                        }
                    });
                }
            } catch (e) { }
        };

        client.on('qr', (qr) => {
            currentQR = qr;
            wStatus = 'WAITING_FOR_SCAN';
            broadcastStatus();
            // Try to hook into puppeteer page after first QR
            setupNavigationListener();
        });

        client.on('authenticated', () => {
            console.log('WhatsApp Client Authenticated!');
            if (wStatus !== 'READY') {
                wStatus = 'AUTHENTICATING';
                currentQR = '';
                broadcastStatus();
            }
        });

        client.on('remote_session_saved', () => {
            console.log('✅ WhatsApp session saved to MongoDB (will survive redeployments)');
        });

        client.on('loading_screen', (percent, message) => {
            console.log('LOADING SCREEN', percent, message);
            if (wStatus !== 'READY') {
                wStatus = 'AUTHENTICATING';
                currentQR = '';
                broadcastStatus();
            }
        });

        client.on('ready', async () => {
            console.log('WhatsApp Client is Ready!');
            isReady = true;
            currentQR = '';
            wStatus = 'READY';

            // Get current user's phone number BEFORE broadcasting
            currentPhoneNumber = client.info.wid._serialized;
            currentUserName = client.info.pushname || '';
            console.log(`Logged in as: ${currentUserName} (${currentPhoneNumber})`);
            broadcastStatus();

            // Run heavy background tasks without blocking the 'ready' event broadcast
            const runBackgroundSync = async () => {
                // Upsert user in database
                try {
                    const User = require('../models/User');
                    await User.updateOne(
                        { phoneNumber: currentPhoneNumber },
                        { $set: { name: currentUserName, lastLogin: new Date() } },
                        { upsert: true }
                    );
                    console.log(`User upserted: ${currentPhoneNumber}`);
                } catch (e) {
                    console.error('User upsert error:', e.message);
                }

                try {
                    console.log('Orphaned data migration...');
                    const Contact = require('../models/Contact');
                    const Campaign = require('../models/Campaign');
                    const Message = require('../models/Message');

                    await Contact.updateMany({ owner: { $exists: false } }, { $set: { owner: currentPhoneNumber } });
                    await Campaign.updateMany({ owner: { $exists: false } }, { $set: { owner: currentPhoneNumber } });
                    await Message.updateMany({ owner: { $exists: false } }, { $set: { owner: currentPhoneNumber } });
                } catch (mErr) {
                    console.error('Migration error:', mErr.message);
                }

                try {
                    console.log('Avto-sinxronizasiya başladılır...');
                    const Contact = require('../models/Contact');
                    const contacts = await client.getContacts();
                    const myContacts = contacts.filter(c => c.isUser && c.isMyContact && c.name);

                    let addedCount = 0;
                    let updatedCount = 0;

                    // Collect valid phone numbers from WhatsApp
                    const validPhones = new Set();

                    for (const c of myContacts.filter(c => c.id.server === 'c.us')) {
                        const phone = c.number;
                        if (!phone || phone === '0' || phone.length > 15) continue;
                        validPhones.add(phone);
                        try {
                            const result = await Contact.updateOne(
                                { phone, owner: currentPhoneNumber },
                                { $set: { name: c.name, phone, owner: currentPhoneNumber } },
                                { upsert: true }
                            );
                            if (result.upsertedCount > 0) addedCount++;
                            else if (result.modifiedCount > 0) updatedCount++;
                        } catch (e) {
                            console.error('Insert error for phone', phone, ':', e.message);
                        }
                    }

                    // Remove DB contacts that are no longer in WhatsApp contact list
                    const staleResult = await Contact.deleteMany({
                        owner: currentPhoneNumber,
                        phone: { $nin: Array.from(validPhones) }
                    });
                    const removedCount = staleResult.deletedCount || 0;

                    console.log(`Avto-sinxronizasiya bitdi. ${addedCount} yeni, ${updatedCount} yenilənən, ${removedCount} silinən kontakt.`);
                } catch (error) {
                    console.error('Kontaktların avtomatik sinxronizasiyasında xəta:', error);
                }
            };

            runBackgroundSync();
        });

        client.on('disconnected', async () => {
            console.log('WhatsApp Client was Disconnected!');
            isReady = false;
            currentQR = '';
            wStatus = 'DISCONNECTED';
            currentPhoneNumber = '';
            currentUserName = '';
            broadcastStatus();

            // Destroy client but do NOT clear session automatically.
            // This allows the session to persist across reloads/reconnects.
            try { await client.destroy(); } catch (e) { }
            setTimeout(() => initializeWhatsApp(), 2000);
        });

        // Detect when ADMIN sends a message → pause AI for that customer
        client.on('message_create', async (message) => {
            if (message.fromMe && !message.to.includes('@g.us') && message.to !== 'status@broadcast') {
                const recipient = message.to;
                if (recipient && recipient.includes('@c.us')) {
                    const session = SessionManager.get(recipient);
                    if (session.step !== 'HUMAN_TAKEOVER') {
                        console.log(`[TAKEOVER] Admin sent message to ${recipient} — AI suspended`);
                    }
                    SessionManager.update(recipient, { step: 'HUMAN_TAKEOVER' });
                }
            }
        });

        client.on('message', async (message) => {
            // We will process incoming messages here
            console.log(`Received message from ${message.from}: ${message.body}`);

            // Ignore status broadcasts or groups if preferred
            if (message.from === 'status@broadcast' || message.from.includes('@g.us')) return;

            try {
                // GET REAL PHONE NUMBER (Removes @lid mask)
                let realSender = message.from;
                try {
                    const contact = await message.getContact();
                    if (contact && contact.number) {
                        realSender = `${contact.number}@c.us`;
                    }
                } catch (err) {
                    console.error('Nömrə əldə edilə bilmədi, raw istifadə edilir.', err);
                }

                const cleanMsg = message.body.trim().toLowerCase();
                const session = SessionManager.get(realSender);

                let botReplyText = '';
                let skipAI = false;

                // Helper: Send notification to kassa/staff
                const notifyStaff = async (reason) => {
                    const kassaPhone = `${process.env.KASSA_PHONE}@c.us`;
                    const notifyMsg = `📢 *YENİ MÜRACİƏT*\n\n👤 Müştəri: +${realSender.replace('@c.us', '')}\n📋 Mövzu: ${reason}\n\nZəhmət olmasa əlaqə saxlayın.`;
                    try {
                        await client.sendMessage(kassaPhone, notifyMsg);
                    } catch (err) {
                        console.error('Bildiriş göndərilə bilmədi:', err.message);
                    }
                };

                // ═══════════════════════════════════════════
                // STEP 0: If human took over this chat, bot stays silent
                // ═══════════════════════════════════════════
                if (session.step === 'HUMAN_TAKEOVER') {
                    return;
                }

                // ═══════════════════════════════════════════
                // STEP 1: First message → Show greeting menu
                // ═══════════════════════════════════════════
                if (session.step === 'IDLE') {
                    botReplyText = `Salam, hörmətli tamaşaçı! 🎭\nSizi *Azərbaycan Dövlət Akademik Musiqili Teatrı* adından salamlayırıq.\n\nZəhmət olmasa, aşağıdakı seçimlərdən birini qeyd edin:\n\n1️⃣ Aylıq repertuar haqqında məlumat\n2️⃣ Biletləri haradan əldə edə bilərəm?\n3️⃣ Kütləvi bilet alışı və endirimlər barədə məlumat\n4️⃣ Teatrın ünvanı haqqında məlumat\n5️⃣ Teatr və tamaşalar barədə ümumi məlumat\n6️⃣ Digər\n\nSualınızı seçdiyiniz üçün təşəkkür edirik! Sizə məmnuniyyətlə kömək edəcəyik. 😊`;
                    SessionManager.update(realSender, { step: 'AWAITING_MENU' });
                    skipAI = true;
                }

                // ═══════════════════════════════════════════
                // STEP 2: Handle Menu Selection (1-6)
                // ═══════════════════════════════════════════
                if (!skipAI && session.step === 'AWAITING_MENU') {
                    // Option 1: Monthly repertoire
                    if (cleanMsg === '1' || cleanMsg.includes('repertuar')) {
                        const aiResult = await generateBotReply('bu ay hansı tamaşalar var');
                        botReplyText = aiResult.text;
                        if (aiResult.events && aiResult.events.length > 0) {
                            SessionManager.update(realSender, {
                                lastEvents: aiResult.events,
                                step: 'SELECTING_EVENT'
                            });
                        }
                        skipAI = true;
                    }
                    // Option 2: Where to buy tickets
                    else if (cleanMsg === '2' || cleanMsg.includes('bilet') && cleanMsg.includes('hara')) {
                        botReplyText = `Biletləri şəhərin bütün mərkəzləşdirilmiş kassalarından, *"ASAN xidmət"* mərkəzlərindən, eləcə də *iticket.az* saytından əldə etmək olar.\n\nƏlavə olaraq WhatsApp üzərindən online kassadan da ala bilərsiniz.`;
                        SessionManager.update(realSender, { step: 'AWAITING_FOLLOWUP' });
                        skipAI = true;
                    }
                    // Option 3: Bulk tickets & discounts
                    else if (cleanMsg === '3' || cleanMsg.includes('kütləvi') || cleanMsg.includes('endirim')) {
                        botReplyText = `Əməkdaşımız sizinlə tezliklə əlaqə saxlayacaq. 😊`;
                        await notifyStaff('Kütləvi bilet alışı və endirimlər');
                        SessionManager.update(realSender, { step: 'HUMAN_TAKEOVER' });
                        skipAI = true;
                    }
                    // Option 4: Theatre address
                    else if (cleanMsg === '4' || cleanMsg.includes('ünvan') || cleanMsg.includes('adres')) {
                        botReplyText = `📍 *Azərbaycan Dövlət Akademik Musiqili Teatrı*\n\n🏠 Ünvan: Bakı şəhəri, Zərifə Əliyeva küç. 8\n🚇 Sahil metrosunun yaxınlığı\n\n📌 Google Maps: https://maps.app.goo.gl/niPHaCf95CZ2jKUh6`;
                        SessionManager.update(realSender, { step: 'AWAITING_FOLLOWUP' });
                        skipAI = true;
                    }
                    // Option 5: General info about theatre
                    else if (cleanMsg === '5' || cleanMsg.includes('ümumi')) {
                        botReplyText = `Teatr və tamaşalarla bağlı məlumatı rəsmi saytımızdan əldə edə bilərsiniz:\n🌐 https://musiqiliteatr.az/`;
                        SessionManager.update(realSender, { step: 'AWAITING_FOLLOWUP' });
                        skipAI = true;
                    }
                    // Option 6: Other
                    else if (cleanMsg === '6' || cleanMsg.includes('digər')) {
                        botReplyText = `Əməkdaşımız sizinlə tezliklə əlaqə saxlayacaq. 😊`;
                        await notifyStaff('Digər sual');
                        SessionManager.update(realSender, { step: 'HUMAN_TAKEOVER' });
                        skipAI = true;
                    }
                    // Invalid selection → repeat menu
                    else {
                        botReplyText = `Zəhmət olmasa 1-6 arasında rəqəm seçin:

1️⃣ Aylıq repertuar haqqında məlumat
2️⃣ Biletləri haradan əldə edə bilərəm?
3️⃣ Kütləvi bilet alışı və endirimlər barədə məlumat
4️⃣ Teatrın ünvanı haqqında məlumat
5️⃣ Teatr və tamaşalar barədə ümumi məlumat
6️⃣ Digər`;
                        skipAI = true;
                    }
                }

                // ═══════════════════════════════════════════
                // STEP 3: Follow-up after options 2, 4, 5 → handoff to human
                // ═══════════════════════════════════════════
                if (!skipAI && session.step === 'AWAITING_FOLLOWUP') {
                    botReplyText = `Əməkdaşımız sizinlə tezliklə əlaqə saxlayacaq. 😊`;
                    await notifyStaff('Əlavə sual (mövzu: müştəri əvvəlki cavabdan sonra yazdı)');
                    SessionManager.update(realSender, { step: 'HUMAN_TAKEOVER' });
                    skipAI = true;
                }

                // ═══════════════════════════════════════════
                // STEP 4: Handle Payment Method Selection (iTicket vs Kassa)
                // ═══════════════════════════════════════════
                if (!skipAI && session.step === 'SELECTING_METHOD' && session.selectedEvent) {
                    if (cleanMsg === '1' || cleanMsg.includes('iticket')) {
                        botReplyText = `Buyurun, *${session.selectedEvent.title}* tamaşası üçün onlayn bilet linki:\n${session.selectedEvent.link}\n\nXoş seyirlər! 🎭`;
                        SessionManager.clear(realSender);
                        skipAI = true;
                    } else if (cleanMsg === '2' || cleanMsg.includes('kassa') || cleanMsg.includes('teatr')) {
                        botReplyText = `Təşəkkür edirik. Əməkdaşımız sizinlə tezliklə əlaqə saxlayacaq. 😊`;
                        const kassaPhone = `${process.env.KASSA_PHONE}@c.us`;
                        const notifyMsg = `📢 *YENİ BİLET SİFARİŞİ (KASSA)*\n\n👤 Müştəri: +${realSender.replace('@c.us', '')}\n🎭 Tamaşa: *${session.selectedEvent.title}*\n📅 Tarix: ${session.selectedEvent.date}\n\nTeatrın kassasından bilet almaq istəyən var. Zəhmət olmasa əlaqə saxlayın.`;
                        try {
                            await client.sendMessage(kassaPhone, notifyMsg);
                        } catch (err) {
                            console.error('Kassa bildirişi göndərilə bilmədi:', err.message);
                        }
                        SessionManager.update(realSender, { step: 'HUMAN_TAKEOVER', lastEvents: [], selectedEvent: null });
                        skipAI = true;
                    }
                }

                // ═══════════════════════════════════════════
                // STEP 5: Handle Event Selection from List
                // ═══════════════════════════════════════════
                if (!skipAI && session.lastEvents && session.lastEvents.length > 0) {
                    const cleanText = (t) => t.toLowerCase().replace(/["""''«».,!?]/g, '').trim();
                    const msgWords = cleanText(cleanMsg).split(/[\s\-]+/).filter(w => w.length > 2);

                    let bestMatch = null;
                    let bestScore = 0;

                    for (const e of session.lastEvents) {
                        const title = cleanText(e.title);
                        const titleWords = title.split(/[\s\-]+/).filter(w => w.length > 2);
                        let score = 0;

                        if (cleanMsg.includes(title)) {
                            score = 100;
                        } else {
                            for (const mw of msgWords) {
                                for (const tw of titleWords) {
                                    if (mw === tw) {
                                        score += 10;
                                    } else if ((mw.length >= 4 && tw.startsWith(mw)) || (tw.length >= 4 && mw.startsWith(tw))) {
                                        score += 8;
                                    }
                                }
                            }
                        }

                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = e;
                        }
                    }

                    if (bestMatch && bestScore >= 8) {
                        SessionManager.update(realSender, {
                            step: 'SELECTING_METHOD',
                            selectedEvent: bestMatch
                        });
                        botReplyText = `*${bestMatch.title}* tamaşasını seçdiniz. 👍\n\nBiletinizi hardan almaq istəyirsiniz?\n1. *iTicket* (Onlayn)\n2. *Teatrın kassasından*\n\nZəhmət olmasa seçiminiz qeyd edin.`;
                        skipAI = true;
                    }
                }

                // ═══════════════════════════════════════════
                // STEP 6: Fallback to AI
                // ═══════════════════════════════════════════
                if (!skipAI) {
                    const aiResult = await generateBotReply(message.body);
                    botReplyText = aiResult.text;

                    if (aiResult.events && aiResult.events.length > 0) {
                        SessionManager.update(realSender, {
                            lastEvents: aiResult.events,
                            step: 'SELECTING_EVENT'
                        });
                    }

                    // If AI gave handoff response → notify staff + pause bot
                    if (botReplyText.includes('Əməkdaşımız sizinlə tezliklə əlaqə saxlayacaq')) {
                        await notifyStaff('Müştəri mövzudan kənar sual yazdı');
                        SessionManager.update(realSender, { step: 'HUMAN_TAKEOVER' });
                    }
                }

                const userMsgRecord = new Message({
                    sender: realSender,
                    receiver: client.info.wid._serialized,
                    text: message.body,
                    isBotReply: false,
                    owner: currentPhoneNumber
                });
                await userMsgRecord.save();

                // Send reply
                await client.sendMessage(message.from, botReplyText);

                // Save bot reply
                const botMsg = new Message({
                    sender: client.info.wid._serialized,
                    receiver: realSender,
                    text: botReplyText,
                    isBotReply: true,
                    owner: currentPhoneNumber
                });
                await botMsg.save();

            } catch (error) {
                console.error('Error handling incoming message:', error);
            }
        });

        client.initialize().catch(err => {
            console.error('WhatsApp initialization failed (often due to context reload). Attempting restart in 5 seconds...', err.message);
            initializationLock = false;
            setTimeout(initializeWhatsApp, 5000);
        });
    } finally {
        initializationLock = false;
    }
};

const sendBulkMessage = async (contacts, body) => {
    if (!isReady) {
        throw new Error('WhatsApp Client not ready yet');
    }

    const results = [];
    for (const contact of contacts) {
        // Formatting to whatsapp ID (usually phone-number@c.us)
        const numberDetails = await client.getNumberId(contact.phone);
        if (numberDetails) {
            try {
                await client.sendMessage(numberDetails._serialized, body);
                results.push({ phone: contact.phone, status: 'success' });
            } catch (err) {
                console.error(`Error sending message to ${contact.phone}`, err);
                results.push({ phone: contact.phone, status: 'failed', error: err.message });
            }
        } else {
            results.push({ phone: contact.phone, status: 'failed', error: 'Number not registered on WhatsApp' });
        }

        // Delay to prevent getting banned
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    }
    return results;
}

const getStatus = () => {
    return { status: wStatus, qr: currentQR, phoneNumber: currentPhoneNumber, userName: currentUserName };
};

const getDeviceContacts = async () => {
    if (!isReady) {
        throw new Error('WhatsApp Client is not ready');
    }
    const contacts = await client.getContacts();
    return contacts.filter(c => c.isUser && c.isMyContact && c.name);
};

const getDeviceChats = async () => {
    try {
        if (!isReady || !client || !client.pupPage || client.pupPage.isClosed()) {
            console.error('getDeviceChats failed: Client or Page not ready');
            throw new Error('WhatsApp Client is not ready');
        }

        log('DEBUG', 'Fetching chats (defensive)...');

        // Fetch chats with a timeout
        const chats = await Promise.race([
            client.getChats(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('getChats timeout')), 10000))
        ]);

        log('DEBUG', `Total chats: ${chats.length}`);

        const results = [];
        // Only process the most recent 50 to avoid massive loop delays
        const processedChats = chats.slice(0, 80);

        for (const c of processedChats) {
            try {
                if (!c || !c.id || !c.id.user || c.id.user === '0' || c.id.user === 'status') continue;
                if (c.isGroup || c.id._serialized.includes('status@') || c.id._serialized.includes('@newsletter')) continue;

                // Defensive name resolution
                let realPhone = c.id.user;
                let contactName = c.name || '';

                // Try quick contact resolution (3s timeout)
                try {
                    const contact = await Promise.race([
                        c.getContact(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
                    ]).catch(() => null);

                    if (contact) {
                        if (contact.number) realPhone = contact.number;
                        contactName = contact.name || contact.pushname || contactName;
                    }
                } catch (e) { }

                if (!realPhone || realPhone === '0') continue;

                let snippet = '';
                try {
                    if (c.lastMessage) {
                        snippet = c.lastMessage.body || '';
                        if (c.lastMessage.hasMedia || c.lastMessage.type !== 'chat') {
                            if (!snippet || (snippet.length > 50 && !snippet.includes(' '))) snippet = `📷 [Media]`;
                        }
                    }
                } catch (msgErr) {
                    snippet = '[Mesaj yüklənə bilmədi]';
                }

                results.push({
                    id: realPhone,
                    name: contactName || `+${realPhone}`,
                    unreadCount: c.unreadCount || 0,
                    timestamp: (c.timestamp || 0) * 1000,
                    lastMessage: snippet,
                    lastSenderClient: (c.lastMessage && c.lastMessage.fromMe) ? true : false
                });
            } catch (innerError) {
                console.error(`Error processing individual chat ${c?.id?._serialized}:`, innerError.message);
            }
        }

        log('DEBUG', `getDeviceChats success: ${results.length} results`);
        return results.slice(0, 50);
    } catch (error) {
        log('FATAL', `getDeviceChats: ${error.message}`);
        console.error('getDeviceChats fatal error:', error);
        throw error;
    }
};

const messageCache = new Map();
const cacheKeys = [];
const cacheMessage = (m) => {
    const id = m.id._serialized;
    if (!messageCache.has(id)) {
        cacheKeys.push(id);
        if (cacheKeys.length > 2000) {
            const oldest = cacheKeys.shift();
            messageCache.delete(oldest);
        }
    }
    messageCache.set(id, m);
};

const getDeviceMessages = async (phone, limit = 50) => {
    if (!isReady) throw new Error('WhatsApp Client is not ready');
    let chat;

    // First try direct c.us lookup
    try {
        chat = await client.getChatById(`${phone}@c.us`);
    } catch (e) { }

    // If not found, iterate all chats and match by resolved contact number (handles LID)
    if (!chat) {
        const chats = await client.getChats();
        for (const c of chats) {
            if (c.isGroup) continue;
            try {
                const contact = await c.getContact();
                if (contact && contact.number === phone) {
                    chat = c;
                    break;
                }
            } catch (e) { }
            // Also try direct user match
            if (c.id.user === phone) {
                chat = c;
                break;
            }
        }
    }

    if (!chat) return [];

    const messages = await chat.fetchMessages({ limit });
    return messages.map(m => {
        cacheMessage(m);
        let bodyTxt = m.body || '';
        if (m.hasMedia || m.type !== 'chat') {
            if (bodyTxt.length > 100 && !bodyTxt.includes(' ')) bodyTxt = `📷 [Media]`;
            else if (!bodyTxt) bodyTxt = `📷 [Media]`;
        }
        return {
            _id: m.id._serialized,
            text: bodyTxt,
            isBotReply: m.fromMe,
            timestamp: m.timestamp * 1000,
            isRead: m.isNew === undefined ? true : !m.isNew,
            hasMedia: m.hasMedia,
            type: m.type // video, image, ptt, audio, document
        };
    });
};
;

const deleteChatHistory = async (phone) => {
    const logF = (msg) => {
        log('DELETE', msg);
    }

    logF(`--- START DELETE CHAT FOR: ${phone} ---`);
    if (!isReady) {
        logF('Client is not ready');
        return false;
    }
    try {
        // Find the chat from the active chat list
        const chats = await client.getChats();
        logF(`Total loaded chats: ${chats.length}`);

        let chat = chats.find(c => c.id.user === phone);
        if (chat) logF(`Found chat by strict user ID match: ${chat.id._serialized}`);

        if (!chat) {
            // Fallback: Check if any chat's full serialized ID contains this number
            // (fixes issues with @lid or old phantom IDs)
            chat = chats.find(c => c.id._serialized && c.id._serialized.includes(phone));
            if (chat) logF(`Found chat by fallback serialized ID match: ${chat.id._serialized}`);
        }

        if (!chat) {
            logF(`Not in cached chats. Attempting direct getChatById for ${phone}@c.us...`);
            try {
                chat = await client.getChatById(`${phone}@c.us`);
                if (chat) logF(`Found chat via direct getChatById: ${chat.id._serialized}`);
            } catch (e) {
                logF(`getChatById also failed: ${e.message}`);
            }
        }

        if (chat) {
            try {
                // Sometimes Clear is needed before Delete for proper Multi-Device sync
                logF(`Attempting clearMessages() on ${chat.id._serialized}`);
                await chat.clearMessages();
                logF(`clearMessages() success`);
            } catch (e) { logF(`clearMessages() failed: ${e.message}`); console.error('Clear messages failed:', e); }

            try {
                logF(`Attempting delete() on ${chat.id._serialized}`);
                await chat.delete();
                logF(`delete() success`);
                return true;
            } catch (e) {
                logF(`delete() failed: ${e.message}`);
                console.error('Delete chat failed:', e);
            }
        } else {
            logF(`Chat with ${phone} not found on the device's chat list.`);
            console.log(`Chat with ${phone} not found on the device's chat list.`);
        }
    } catch (err) {
        logF(`Outer scope err: ${err.message}`);
        console.error('Telefonda söhbəti silərkən xəta yarandı:', err);
    }
    return false;
};

// Shared helper: resolves a phone number to the correct WhatsApp chat ID
// Handles LID-based IDs and fallback methods in one place
const resolveChatId = async (phone) => {
    let chatId = `${phone}@c.us`;
    try {
        const chats = await client.getChats();
        for (const c of chats) {
            if (c.isGroup) continue;
            try {
                const contact = await c.getContact();
                if (contact && contact.number === phone) {
                    return c.id._serialized;
                }
            } catch (e) { }
            if (c.id.user === phone) {
                return c.id._serialized;
            }
        }
    } catch (e) { }
    return chatId;
};

const markChatAsRead = async (phone) => {
    if (!isReady) return false;
    try {
        const chatId = await resolveChatId(phone);
        const chat = await client.getChatById(chatId).catch(() => null);
        if (chat) {
            await chat.sendSeen();
            return true;
        }
    } catch (e) {
        console.error('Error sending seen receipt:', e);
    }
    return false;
};

const sendDeviceMessage = async (phone, text, replyToId) => {
    if (!isReady) throw new Error('WhatsApp Client is not ready');
    const chatId = await resolveChatId(phone);
    const options = {};
    if (replyToId) options.quotedMessageId = replyToId;
    await client.sendMessage(chatId, text, options);
};

const sendDeviceMediaMessage = async (phone, filePath, caption = '', replyToId) => {
    if (!isReady) throw new Error('WhatsApp Client is not ready');
    const chatId = await resolveChatId(phone);
    const media = MessageMedia.fromFilePath(filePath);
    const options = { caption };
    if (replyToId) options.quotedMessageId = replyToId;
    await client.sendMessage(chatId, media, options);
};

const getMessageMedia = async (msgId) => {
    if (!isReady) throw new Error('WhatsApp Client is not ready');
    const msg = messageCache.get(msgId);
    if (!msg) throw new Error('Message not found in memory cache. Please reopen the chat.');
    if (!msg.hasMedia) throw new Error('Message does not have media');

    const media = await msg.downloadMedia();
    return media; // Object with .mimetype and .data (base64)
};

const getProfilePic = async (phone) => {
    if (!isReady) throw new Error('WhatsApp Client is not ready');
    try {
        const contactId = await resolveChatId(phone);
        const profilePicUrl = await client.getProfilePicUrl(contactId);
        return profilePicUrl || '';
    } catch (e) {
        if (e.message && !e.message.includes('isNewsletter') && !e.message.includes('reading \'id\'')) {
            console.error('Profile pic not available for', phone);
        }
        return '';
    }
};

// Clear LocalAuth session folder to prevent stale data
const clearSession = async (retries = 3) => {
    const sessionPath = path.join(__dirname, '..', '.wwebjs_auth');
    for (let i = 0; i < retries; i++) {
        try {
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log('LocalAuth session cleared.');
            }
            return true; // Success
        } catch (e) {
            console.error(`Session clear attempt ${i + 1} failed:`, e.message);
            if (i < retries - 1) {
                console.log('Retrying in 500ms...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    return false;
};

const logoutWhatsApp = async () => {
    try {
        console.log('Attempting WhatsApp logout...');
        if (client) {
            try {
                // Ignore "detached frame" error by wrapping logout
                await client.logout();
            } catch (e) {
                console.log('Logout already requested or frame detached, proceeding to destroy.');
            }

            try {
                await client.destroy();
            } catch (e) {
                console.log('Destroy failed or already closed.');
            }
        }

        // Ensure browser fully terminates before clearing files (especially on Windows)
        console.log('Waiting 2 seconds for browser processes to exit...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        isReady = false;
        currentQR = '';
        wStatus = 'DISCONNECTED';
        currentPhoneNumber = '';
        currentUserName = '';
        broadcastStatus();

        await clearSession();
        initializeWhatsApp();
        return { success: true };
    } catch (error) {
        console.error('Final WhatsApp logout catch-all error:', error);
        isReady = false;
        currentQR = '';
        wStatus = 'DISCONNECTED';
        currentPhoneNumber = '';
        currentUserName = '';
        broadcastStatus();

        await clearSession();
        initializeWhatsApp();
        return { success: true };
    }
};

module.exports = {
    initializeWhatsApp,
    getStatus,
    statusEmitter,
    sendBulkMessage,
    getDeviceContacts,
    getDeviceChats,
    getDeviceMessages,
    sendDeviceMessage,
    sendDeviceMediaMessage,
    deleteChatHistory,
    markChatAsRead,
    getMessageMedia,
    getProfilePic,
    logoutWhatsApp,
    broadcastCampaignUpdate
};
