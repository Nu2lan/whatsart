/**
 * Centralized logger with automatic rotation.
 * Max size: 5MB. On exceed, renames to whatsart-debug.log.old and starts fresh.
 */
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../whatsart-debug.log');
const LOG_OLD  = path.join(__dirname, '../whatsart-debug.log.old');
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const rotateLogs = () => {
    try {
        const stat = fs.statSync(LOG_FILE);
        if (stat.size >= MAX_SIZE_BYTES) {
            // Overwrite .old with current log — keeps last 2 generations
            fs.renameSync(LOG_FILE, LOG_OLD);
        }
    } catch (e) {
        // File may not exist yet — that's fine
    }
};

/**
 * Write a log entry.
 * @param {string} tag  - Category label e.g. 'SCRAPER', 'AI', 'DEBUG'
 * @param {string} msg  - Log message
 */
const log = (tag, msg) => {
    rotateLogs();
    const line = `[${tag}] ${new Date().toISOString()} - ${msg}\n`;
    try {
        fs.appendFileSync(LOG_FILE, line);
    } catch (e) {
        // Non-fatal — never crash the app due to logging failure
    }
};

module.exports = { log };
