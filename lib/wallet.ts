import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import * as CryptoJS from 'crypto-js';

const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

export function generateWallet(): { publicKey: string; privateKey: Uint8Array } {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: keypair.secretKey,
  };
}

export function encryptPrivateKey(privateKey: Uint8Array): string {
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('WALLET_ENCRYPTION_KEY is not set');
  }

  const privateKeyHex = Buffer.from(privateKey).toString('hex');
  const encrypted = CryptoJS.AES.encrypt(privateKeyHex, encryptionKey).toString();
  return encrypted;
}

export function decryptPrivateKey(encryptedKey: string): Uint8Array {
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('WALLET_ENCRYPTION_KEY is not set');
  }

  const decrypted = CryptoJS.AES.decrypt(encryptedKey, encryptionKey);
  const privateKeyHex = decrypted.toString(CryptoJS.enc.Utf8);
  return new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
}

export async function getWalletBalance(address: string): Promise<number> {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const publicKey = new PublicKey(address);
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

export async function transferSol(
  fromEncryptedKey: string,
  toAddress: string,
  amount: number
): Promise<string> {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  
  const privateKey = decryptPrivateKey(fromEncryptedKey);
  const fromKeypair = Keypair.fromSecretKey(privateKey);
  const toPublicKey = new PublicKey(toAddress);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
  return signature;
}