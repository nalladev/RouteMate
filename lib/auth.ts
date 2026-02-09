import * as CryptoJS from 'crypto-js';
import { randomBytes } from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  const seed = process.env.PASSWORD_HASHING_SEED || 'default-seed-change-in-production';
  const saltRounds = 10;
  
  // Create a salt using the password and seed
  const salt = CryptoJS.SHA256(seed + Date.now().toString()).toString();
  
  // Hash the password with salt multiple times (simulating bcrypt rounds)
  let hash = password + seed;
  for (let i = 0; i < saltRounds; i++) {
    hash = CryptoJS.SHA512(hash + salt).toString();
  }
  
  // Return salt:hash format for verification
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const seed = process.env.PASSWORD_HASHING_SEED || 'default-seed-change-in-production';
  const saltRounds = 10;
  
  try {
    // Extract salt and hash from stored format
    const [salt, originalHash] = storedHash.split(':');
    
    if (!salt || !originalHash) {
      return false;
    }
    
    // Recreate the hash with the same salt
    let hash = password + seed;
    for (let i = 0; i < saltRounds; i++) {
      hash = CryptoJS.SHA512(hash + salt).toString();
    }
    
    // Compare hashes
    return hash === originalHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}