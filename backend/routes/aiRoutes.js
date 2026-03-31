const express = require('express');
const router = express.Router();
const { suggestImprovements } = require('../services/aiService');

// Analyze and improve draft text
router.post('/suggest-improvements', async (req, res) => {
    try {
        const { draftText } = req.body;
        if (!draftText) {
            return res.status(400).json({ error: 'Draft text is required' });
        }

        const suggestions = await suggestImprovements(draftText);
        res.status(200).json({ suggestions });
    } catch (error) {
        console.error('AI Improvement error:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});

module.exports = router;
