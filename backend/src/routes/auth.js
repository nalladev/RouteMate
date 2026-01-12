/**
 * Authentication Routes
 * Handles user login and token generation
 */

const express = require('express');
const { auth } = require('../config/firebase');
const authService = require('../services/authService');

const router = express.Router();

/**
 * POST /auth/login
 * Login with phone number
 */
router.post('/login', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required.' });
    }

    try {
        const userRecord = await authService.getUserOrCreateByPhone(phone);
        const tokens = await authService.generateTokens(userRecord.uid);

        res.status(200).json(tokens);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: `Error processing login: ${error.message}` });
    }
});

/**
 * POST /auth/firebase
 * Authenticate with Firebase token
 */
router.post('/firebase', async (req, res) => {
    const { firebaseToken, phoneNumber } = req.body;

    if (!firebaseToken) {
        return res.status(400).json({ message: 'Firebase token is required.' });
    }

    try {
        const result = await authService.authenticateFirebaseToken(firebaseToken, phoneNumber);
        res.status(200).json(result);
    } catch (error) {
        console.error('Firebase authentication error:', error);
        res.status(401).json({ message: 'Invalid Firebase token.' });
    }
});

/**
 * POST /auth/phone-email
 * Authenticate with phone.email JWT token
 */
router.post('/phone-email', async (req, res) => {
    const { jwtToken } = req.body;

    if (!jwtToken) {
        return res.status(400).json({ message: 'JWT token is required.' });
    }

    try {
        const result = await authService.authenticatePhoneEmailToken(jwtToken);
        res.status(200).json(result);
    } catch (error) {
        console.error('Phone.email authentication error:', error);
        res.status(401).json({ message: 'Invalid JWT token.' });
    }
});

module.exports = router;
