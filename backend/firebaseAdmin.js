const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        "base64"
      ).toString("utf8")
    ))
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };
