/**
 * Authentication Service
 * Handles user authentication logic and user profile creation
 */

const jwt = require('jsonwebtoken');
const { auth, db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * Get or create user by phone number
 * @param {string} phone - User's phone number
 * @returns {Promise<Object>} User record
 */
const getUserOrCreateByPhone = async (phone) => {
    let userRecord;

    try {
        userRecord = await auth.getUserByPhoneNumber(phone);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({ phoneNumber: phone });
            await createUserProfile(userRecord.uid, phone);
        } else {
            throw error;
        }
    }

    return userRecord;
};

/**
 * Create user profile in Firestore
 * @param {string} uid - User ID
 * @param {string} phone - Phone number
 * @returns {Promise<void>}
 */
const createUserProfile = async (uid, phone) => {
    await db.collection('users').doc(uid).set({
        uid: uid,
        phone: phone,
        walletPoints: 100, // Welcome bonus
        createdAt: FieldValue.serverTimestamp(),
        stats: {
            totalRidesAsDriver: 0,
            totalRidesAsPassenger: 0,
            rating: 5.0,
            totalPointsEarned: 100
        }
    });

    // Add welcome reward
    await db.collection('rewards').add({
        userId: uid,
        type: 'bonus',
        amount: 100,
        description: 'Welcome bonus',
        metadata: { category: 'signup' },
        status: 'active',
        dateEarned: FieldValue.serverTimestamp()
    });
};

/**
 * Generate authentication tokens
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Firebase token and backend JWT token
 */
const generateTokens = async (uid) => {
    const firebaseCustomToken = await auth.createCustomToken(uid);
    const backendToken = jwt.sign({ uid: uid }, process.env.JWT_SECRET_KEY);

    return {
        firebaseToken: firebaseCustomToken,
        backendToken: backendToken,
        uid: uid
    };
};

/**
 * Create or get user from Firebase ID token
 * @param {string} firebaseToken - Firebase ID token
 * @param {string} phoneNumber - Phone number (optional)
 * @returns {Promise<Object>} User ID and tokens
 */
const authenticateFirebaseToken = async (firebaseToken, phoneNumber = '') => {
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    const { uid } = decodedToken;

    let userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
        await db.collection('users').doc(uid).set({
            uid: uid,
            phone: phoneNumber,
            email: '',
            walletPoints: 100,
            createdAt: FieldValue.serverTimestamp(),
            stats: {
                totalRidesAsDriver: 0,
                totalRidesAsPassenger: 0,
                rating: 5.0,
                totalPointsEarned: 100
            }
        });

        await db.collection('rewards').add({
            userId: uid,
            type: 'bonus',
            amount: 100,
            description: 'Welcome bonus',
            metadata: { category: 'signup' },
            status: 'active',
            dateEarned: FieldValue.serverTimestamp()
        });
    }

    return generateTokens(uid);
};

/**
 * Authenticate JWT token from phone.email service
 * @param {string} jwtToken - JWT token from phone.email
 * @returns {Promise<Object>} User ID and tokens
 */
const authenticatePhoneEmailToken = async (jwtToken) => {
    const decodedToken = jwt.decode(jwtToken);

    if (!decodedToken || !decodedToken.phone_no) {
        throw new Error('Invalid JWT token format');
    }

    const phoneNumber = decodedToken.phone_no;
    const countryCode = decodedToken.country_code || '+91';
    const fullPhoneNumber = countryCode + phoneNumber;
    const uid = `phone_${countryCode.replace('+', '')}_${phoneNumber}`;

    let userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
        await db.collection('users').doc(uid).set({
            uid: uid,
            phone: fullPhoneNumber,
            email: '',
            walletPoints: 100,
            createdAt: FieldValue.serverTimestamp(),
            stats: {
                totalRidesAsDriver: 0,
                totalRidesAsPassenger: 0,
                rating: 5.0,
                totalPointsEarned: 100
            }
        });

        await db.collection('rewards').add({
            userId: uid,
            type: 'bonus',
            amount: 100,
            description: 'Welcome bonus',
            metadata: { category: 'signup' },
            status: 'active',
            dateEarned: FieldValue.serverTimestamp()
        });
    }

    const firebaseCustomToken = await auth.createCustomToken(uid);
    const backendToken = jwt.sign({ uid: uid }, process.env.JWT_SECRET_KEY);

    return {
        firebaseToken: firebaseCustomToken,
        backendToken: backendToken,
        uid: uid
    };
};

module.exports = {
    getUserOrCreateByPhone,
    createUserProfile,
    generateTokens,
    authenticateFirebaseToken,
    authenticatePhoneEmailToken
};
