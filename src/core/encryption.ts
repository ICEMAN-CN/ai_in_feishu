/**
 * AI_Feishu AES-256-GCM Encryption Module
 *
 * Provides encryption/decryption for sensitive data like API keys.
 * Uses AES-256-GCM with random IV for each encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits
const TAG_LENGTH = 16; // 128 bits

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Get encryption key from environment variable
 * @throws Error if key is missing or invalid
 */
export function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable must be set');
  }

  // Must be 64 hex characters (32 bytes)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  // Validate hex format
  if (!/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must be valid hexadecimal (64 characters a-f, A-F, 0-9)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param plainText - The text to encrypt
 * @returns EncryptedData with ciphertext, iv, and tag (all base64)
 */
export function encrypt(plainText: string): EncryptedData {
  if (!plainText) {
    throw new Error('plainText cannot be empty');
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param data - EncryptedData containing ciphertext, iv, and tag
 * @returns Decrypted plaintext
 */
export function decrypt(data: EncryptedData): string {
  if (!data.ciphertext || !data.iv || !data.tag) {
    throw new Error('Invalid EncryptedData: missing ciphertext, iv, or tag');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(data.iv, 'base64');
  const tag = Buffer.from(data.tag, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt plaintext and return as JSON string for storage
 * @param plainText - The text to encrypt
 * @returns JSON string containing ciphertext, iv, tag
 */
export function encryptForStorage(plainText: string): string {
  const encrypted = encrypt(plainText);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt from storage format (JSON string)
 * @param encryptedStr - JSON string containing ciphertext, iv, tag
 * @returns Decrypted plaintext
 */
export function decryptFromStorage(encryptedStr: string): string {
  if (!encryptedStr) {
    throw new Error('encryptedStr cannot be empty');
  }

  let data: EncryptedData;
  try {
    data = JSON.parse(encryptedStr);
  } catch {
    throw new Error('Invalid encrypted data format: not valid JSON');
  }

  return decrypt(data);
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return Boolean(key && key.length === 64 && /^[a-fA-F0-9]{64}$/.test(key));
}

export {};
