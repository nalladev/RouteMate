import { getDocument, initializeFirestore } from './firestore';
import { User } from '../types';

export async function validateSession(token: string): Promise<User | null> {
  if (!token) {
    return null;
  }

  // Backward compatibility: support both legacy single-session field and new multi-session array.
  const users = await getDocument('users', { 'Session.token': token });
  if (users.length === 0) {
    const firestore = initializeFirestore();
    const snapshot = await firestore.collection('users').where('Session.tokens', 'array-contains', token).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    return { Id: userDoc.id, ...userDoc.data() } as User;
  }

  return users[0] as User;
}

export function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}
