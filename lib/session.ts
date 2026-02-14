import { initializeFirestore } from './firestore';
import { Session } from '../types';

const MAX_ACTIVE_SESSIONS = 10;

function normalizeSessionTokens(session: Session | undefined): string[] {
  const fromArray = Array.isArray(session?.tokens) ? session.tokens : [];
  const fromLegacy = session?.token ? [session.token] : [];
  const combined = [...fromArray, ...fromLegacy].filter((value): value is string => Boolean(value));
  return Array.from(new Set(combined));
}

export async function addSessionToken(userId: string, token: string): Promise<Session> {
  const firestore = initializeFirestore();
  const userRef = firestore.collection('users').doc(userId);

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const data = snapshot.data() as { Session?: Session } | undefined;
    const existingTokens = normalizeSessionTokens(data?.Session);
    const nextTokens = [token, ...existingTokens.filter((value) => value !== token)].slice(0, MAX_ACTIVE_SESSIONS);
    const session: Session = { token, tokens: nextTokens };

    transaction.update(userRef, { Session: session });
    return session;
  });
}

export async function removeSessionToken(userId: string, token: string): Promise<Session> {
  const firestore = initializeFirestore();
  const userRef = firestore.collection('users').doc(userId);

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const data = snapshot.data() as { Session?: Session } | undefined;
    const existingTokens = normalizeSessionTokens(data?.Session);
    const nextTokens = existingTokens.filter((value) => value !== token);
    const session: Session = {
      token: nextTokens[0] || '',
      tokens: nextTokens,
    };

    transaction.update(userRef, { Session: session });
    return session;
  });
}
