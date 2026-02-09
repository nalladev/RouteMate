import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  const seed = process.env.PASSWORD_HASHING_SEED || '';
  const saltRounds = 10;
  const passwordWithSeed = password + seed;
  return await bcrypt.hash(passwordWithSeed, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const seed = process.env.PASSWORD_HASHING_SEED || '';
  const passwordWithSeed = password + seed;
  return await bcrypt.compare(passwordWithSeed, hash);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}