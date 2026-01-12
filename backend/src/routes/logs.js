/**
 * Error Logging Routes
 * Receives error logs from client applications
 */

const express = require('express');
const errorLoggingService = require('../services/errorLoggingService');
const { db } = require('../config/firebase');

const router = express.Router();

/**
 * POST /logs/error
 * Receive error log from client application and log to Telegram
 *
 * Request body:
 * {
 *   "timestamp": "2024-01-12T10:30:00Z",
 *   "appVersion": "1.0.0",
 *   "userId": "user123",
 *   "errorType": "NullPointerException",
 *   "message": "Attempted to access null object",
 *   "stackTrace": "...",
 *   "context": { ... }
 * }
 */
router.post('/error', async (req, res) => {
    try {
        const {
            timestamp,
            appVersion,
            userId,
            errorType,
            message,
            stackTrace,
            context
        } = req.body;

        // Validate required fields
        if (!message) {
            return res.status(400).json({ message: 'Error message is required' });
        }

        if (!errorType) {
            return res.status(400).json({ message: 'Error type is required' });
        }

        const errorLog = {
            timestamp: timestamp || new Date().toISOString(),
            appVersion: appVersion || 'Unknown',
            userId: userId || null,
            errorType,
            message,
            stackTrace: stackTrace || null,
            context: context || null
        };

        // Send to Telegram asynchronously (don't wait for it)
        errorLoggingService.sendErrorToTelegram(errorLog)
            .catch(error => console.error('Error sending to Telegram:', error));

        // Optionally store in Firestore for historical tracking
        if (process.env.STORE_ERROR_LOGS === 'true') {
            try {
                await db.collection('error_logs').add({
                    ...errorLog,
                    createdAt: new Date().toISOString(),
                    receivedAt: new Date()
                });
            } catch (firestoreError) {
                console.error('Failed to store error log in Firestore:', firestoreError);
            }
        }

        res.status(202).json({
            message: 'Error log received and will be processed',
            errorId: timestamp // Simple identifier
        });
    } catch (error) {
        console.error('Error processing error log:', error);
        res.status(500).json({ message: `Error processing log: ${error.message}` });
    }
});

/**
 * GET /logs/error
 * Retrieve error logs (admin only - optional)
 */
router.get('/error', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const snapshot = await db.collection('error_logs')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const errorLogs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({ errorLogs });
    } catch (error) {
        console.error('Error fetching error logs:', error);
        res.status(500).json({ message: `Error fetching logs: ${error.message}` });
    }
});

module.exports = router;
