import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;

export function initializeFirestore() {
  if (db) return db;

  try {
    if (!admin.apps.length) {
      const serviceAccountEncoded = process.env.FIREBASE_SERVICE_ACCOUNT_ENCODED;
      
      if (!serviceAccountEncoded) {
        console.error('FIREBASE_SERVICE_ACCOUNT_ENCODED environment variable is not set');
        throw new Error('Firebase credentials not configured. Please set FIREBASE_SERVICE_ACCOUNT_ENCODED environment variable.');
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(
          Buffer.from(serviceAccountEncoded, 'base64').toString('utf-8')
        );
      } catch (parseError) {
        console.error('Failed to parse Firebase service account:', parseError);
        throw new Error('Invalid Firebase credentials format. Please check FIREBASE_SERVICE_ACCOUNT_ENCODED.');
      }

      // Validate service account has required fields
      if (!serviceAccount.project_id) {
        console.error('Service account missing project_id');
        throw new Error('Invalid Firebase service account: missing project_id');
      }
      if (!serviceAccount.private_key) {
        console.error('Service account missing private_key');
        throw new Error('Invalid Firebase service account: missing private_key');
      }
      if (!serviceAccount.client_email) {
        console.error('Service account missing client_email');
        throw new Error('Invalid Firebase service account: missing client_email');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      });
    }

    db = admin.firestore();
    
    // Set Firestore settings - force REST API instead of gRPC to fix Expo compatibility
    db.settings({
      ignoreUndefinedProperties: true,
      preferRest: true, // Use REST API instead of gRPC for Expo compatibility
    });
    
    return db;
  } catch (error) {
    console.error('Firestore initialization error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
}

export async function addDocument(collection: string, data: any): Promise<string> {
  const firestore = initializeFirestore();
  const docRef = await firestore.collection(collection).add(data);
  return docRef.id;
}

export async function updateDocument(
  collection: string,
  docId: string,
  data: any
): Promise<void> {
  const firestore = initializeFirestore();
  await firestore.collection(collection).doc(docId).update(data);
}

export async function getDocument(
  collection: string,
  query: any
): Promise<any[]> {
  try {
    const firestore = initializeFirestore();
    let queryRef: any = firestore.collection(collection);

    for (const [field, value] of Object.entries(query)) {
      queryRef = queryRef.where(field, '==', value);
    }

    const snapshot = await queryRef.get();
    return snapshot.docs.map((doc: any) => ({ Id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error querying collection ${collection}:`, error);
    
    if (error instanceof Error) {
      // Check for common Firestore errors
      if (error.message.includes('PERMISSION_DENIED')) {
        throw new Error('Firestore permission denied. Check Firestore rules and service account permissions.');
      }
      if (error.message.includes('NOT_FOUND')) {
        throw new Error('Firestore database not found. Ensure Firestore is enabled in your Firebase project.');
      }
      if (error.message.includes('UNAVAILABLE') || error.message.includes('undefined')) {
        throw new Error('Cannot connect to Firestore. Check network connectivity and Firebase project configuration.');
      }
    }
    
    throw new Error(`Failed to query ${collection}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getDocumentById(
  collection: string,
  docId: string
): Promise<any | null> {
  const firestore = initializeFirestore();
  const doc = await firestore.collection(collection).doc(docId).get();
  
  if (!doc.exists) {
    return null;
  }

  return { Id: doc.id, ...doc.data() };
}

export async function getAllDocuments(collection: string): Promise<any[]> {
  const firestore = initializeFirestore();
  const snapshot = await firestore.collection(collection).get();
  return snapshot.docs.map((doc: any) => ({ Id: doc.id, ...doc.data() }));
}

export async function deleteDocument(
  collection: string,
  docId: string
): Promise<void> {
  const firestore = initializeFirestore();
  await firestore.collection(collection).doc(docId).delete();
}

export async function runTransaction<T>(
  updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>
): Promise<T> {
  const firestore = initializeFirestore();
  return firestore.runTransaction(updateFunction);
}