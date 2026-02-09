import { getDocument } from './firestore';
import { User } from '../types';

export async function validateSession(token: string): Promise<User | null> {
  if (!token) {
    return null;
  }

  const users = await getDocument('users', { 'Session.token': token });
  
  if (users.length === 0) {
    return null;
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