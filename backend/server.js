const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Prevent puppeteer crashes from killing the server
process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception (handled):', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled Rejection (handled):', reason?.message || reason);
});

// Load env vars
dotenv.config({ override: true });

// Connect to database
if (process.env.MONGO_URI) {
    connectDB();
} else {
    console.warn("MONGO_URI not set in .env. Skipping database connection.");
}


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));

// Initialize WhatsApp Client gracefully
const { initializeWhatsApp } = require('./services/whatsappService');
const { startCampaignRunner } = require('./services/campaignRunner');
// Optional: we might not want it blocking or spamming the QR on every hot reload if not needed
// but for this MVP, we launch it:
initializeWhatsApp();
startCampaignRunner();

// In production, serve the built frontend
const path = require('path');
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    // SPA catch-all: any non-API route serves index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
        }
    });
} else {
    app.get('/', (req, res) => {
        res.send('WhatsArt API is running...');
    });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
