const sessions = new Map();

/**
 * Manages user conversation state for the ticket booking flow.
 * Keys are WhatsApp IDs (e.g. "994xxxxxxxxx@c.us").
 */
const SessionManager = {
    get: (userId) => {
        if (!sessions.has(userId)) {
            sessions.set(userId, {
                step: 'IDLE',
                lastEvents: [],
                selectedEvent: null,
                lastInteraction: Date.now()
            });
        }
        return sessions.get(userId);
    },

    update: (userId, data) => {
        const session = SessionManager.get(userId);
        sessions.set(userId, { ...session, ...data, lastInteraction: Date.now() });
    },

    clear: (userId) => {
        sessions.delete(userId);
    },

    // Periodically clear old sessions (e.g. older than 1 hour)
    cleanup: () => {
        const now = Date.now();
        const timeout = 10 * 24 * 60 * 60 * 1000; // 10 days
        for (const [userId, session] of sessions.entries()) {
            if (now - session.lastInteraction > timeout) {
                sessions.delete(userId);
            }
        }
    }
};

// Run cleanup every 15 minutes
setInterval(SessionManager.cleanup, 15 * 60 * 1000);

module.exports = SessionManager;
