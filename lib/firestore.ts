import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;

export function initializeFirestore() {
  if (db) return db;

  if (!admin.apps.length) {
    const serviceAccountEncoded = process.env.FIREBASE_SERVICE_ACCOUNT_ENCODED;
    if (!serviceAccountEncoded) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_ENCODED is not set');
    }

    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountEncoded, 'base64').toString('utf-8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  db = admin.firestore();
  return db;
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
  const firestore = initializeFirestore();
  let queryRef: any = firestore.collection(collection);

  for (const [field, value] of Object.entries(query)) {
    queryRef = queryRef.where(field, '==', value);
  }

  const snapshot = await queryRef.get();
  return snapshot.docs.map((doc: any) => ({ Id: doc.id, ...doc.data() }));
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