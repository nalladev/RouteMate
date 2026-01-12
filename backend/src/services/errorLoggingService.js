/**
 * Error Logging Service
 * Sends error logs from client applications to Telegram chat
 */

const https = require('https');

/**
 * Send error log to Telegram chat
 * @param {Object} errorLog - Error log object
 * @param {string} errorLog.timestamp - ISO timestamp of error
 * @param {string} errorLog.appVersion - Application version
 * @param {string} errorLog.userId - User ID (optional)
 * @param {string} errorLog.errorType - Type of error
 * @param {string} errorLog.message - Error message
 * @param {string} errorLog.stackTrace - Stack trace (optional)
 * @param {Object} errorLog.context - Additional context (optional)
 * @returns {Promise<void>}
 */
const sendErrorToTelegram = async (errorLog) => {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        console.error('❌ Telegram configuration missing (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
        return;
    }

    try {
        // Format the error message for Telegram
        const formattedMessage = formatErrorMessage(errorLog);

        // Send to Telegram
        await sendTelegramMessage(formattedMessage);
        console.log('✅ Error log sent to Telegram successfully');
    } catch (error) {
        console.error('❌ Failed to send error log to Telegram:', error.message);
    }
};

/**
 * Format error log into a readable Telegram message
 * @param {Object} errorLog - Error log object
 * @returns {string} Formatted message for Telegram
 */
const formatErrorMessage = (errorLog) => {
    const {
        timestamp,
        appVersion,
        userId,
        errorType,
        message,
        stackTrace,
        context
    } = errorLog;

    let formattedMsg = `🚨 <b>ERROR LOG</b>\n\n`;
    formattedMsg += `<b>Timestamp:</b> ${timestamp || 'N/A'}\n`;
    formattedMsg += `<b>App Version:</b> ${appVersion || 'N/A'}\n`;

    if (userId) {
        formattedMsg += `<b>User ID:</b> <code>${userId}</code>\n`;
    }

    formattedMsg += `<b>Error Type:</b> ${errorType || 'Unknown'}\n`;
    formattedMsg += `<b>Message:</b> ${message || 'No message provided'}\n`;

    if (stackTrace) {
        const truncatedStack = stackTrace.substring(0, 500);
        formattedMsg += `\n<b>Stack Trace:</b>\n<pre>${escapeHtml(truncatedStack)}</pre>\n`;
    }

    if (context) {
        const contextStr = JSON.stringify(context, null, 2).substring(0, 300);
        formattedMsg += `\n<b>Context:</b>\n<pre>${escapeHtml(contextStr)}</pre>\n`;
    }

    return formattedMsg;
};

/**
 * Send a message to Telegram chat using the bot API
 * @param {string} message - Message to send (HTML formatted)
 * @returns {Promise<void>}
 */
const sendTelegramMessage = (message) => {
    return new Promise((resolve, reject) => {
        const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

        const postData = JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });

        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    reject(new Error(`Telegram API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
};

/**
 * Escape HTML special characters for Telegram HTML mode
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
const escapeHtml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

module.exports = {
    sendErrorToTelegram,
    formatErrorMessage,
    sendTelegramMessage,
    escapeHtml
};
