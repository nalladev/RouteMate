/**
 * Firebase Configuration
 * Initializes Firebase Admin SDK
 */

const admin = require('firebase-admin');

try {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(
            Buffer.from(
                process.env.GOOGLE_APPLICATION_CREDENTIALS,
                "base64"
            ).toString("utf8")
        ))
    });
    console.log('✅ Firebase initialized');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.error(error.stack);
    throw error;
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };
