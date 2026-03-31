const Campaign = require('../models/Campaign');
const { getStatus, sendDeviceMessage, sendDeviceMediaMessage, broadcastCampaignUpdate } = require('./whatsappService');
const fs = require('fs');


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runPendingCampaigns = async () => {
    if (getStatus().status !== 'READY') return; // Wait until API is ready

    try {
        const now = new Date();
        const pendingCampaigns = await Campaign.find({
            status: 'pending',
            scheduledAt: { $lte: now }
        });

        for (const camp of pendingCampaigns) {
            console.log(`Starting campaign [${camp.name}] for ${camp.audience.length} contacts...`);
            camp.status = 'processing';
            await camp.save();
            broadcastCampaignUpdate(camp);

            for (const phone of camp.audience) {
                try {
                    if (camp.hasMedia && camp.mediaPath && fs.existsSync(camp.mediaPath)) {
                        await sendDeviceMediaMessage(phone, camp.mediaPath, camp.messageBody);
                    } else {
                        await sendDeviceMessage(phone, camp.messageBody);
                    }
                    camp.progress.sent += 1;
                } catch (err) {
                    console.error(`Gønderme xetasi [${phone}]: ${err.message}`);
                    camp.progress.failed += 1;
                }
                
                // Random delay between 3 and 8 seconds to prevent ban
                const delayMs = Math.floor(Math.random() * 5000) + 3000;
                await sleep(delayMs);

                await camp.save(); // save progress
                broadcastCampaignUpdate(camp);
            }

            camp.status = 'completed';
            await camp.save();
            broadcastCampaignUpdate(camp);
            console.log(`Campaign [${camp.name}] finished.`);

            // Cleanup media if present to save space after sending is complete
            if (camp.hasMedia && camp.mediaPath && fs.existsSync(camp.mediaPath)) {
                fs.unlinkSync(camp.mediaPath);
            }
        }
    } catch (e) {
        console.error('Error in campaign runner:', e.message);
    }
};

const _startCampaignRunner = () => {
    setInterval(runPendingCampaigns, 60000); // Check every minute
    console.log('[Runner] Campaign Background Task Started');
};

module.exports = { startCampaignRunner: _startCampaignRunner };
