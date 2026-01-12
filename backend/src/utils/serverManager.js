/**
 * Server Management Utility
 * Handles server health checks and self-ping mechanism
 */

const https = require('https');

const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const SERVER_URL = process.env.SERVER_URL || 'https://routemate-jpsc.onrender.com/health';

/**
 * Perform self-ping to keep server awake
 */
const selfPing = () => {
    https.get(SERVER_URL, {
        headers: { 'X-Self-Ping': 'true' }
    }, (res) => {
        // Handled in health endpoint
    }).on('error', (err) => {
        // Silently fail - will be retried on next interval
        console.error('Self-ping error:', err.message);
    });
};

/**
 * Start self-ping mechanism
 */
const startSelfPing = () => {
    console.log(`[${new Date().toISOString()}] 🚀 Starting self-ping mechanism - pinging every 10 minutes`);
    selfPing(); // Initial ping
    setInterval(selfPing, PING_INTERVAL);
};

module.exports = {
    startSelfPing,
    selfPing
};
