/**
 * AI_Feishu AES-256-GCM Encryption Module
 *
 * Provides encryption/decryption for sensitive data like API keys.
 * Uses AES-256-GCM with random IV for each encryption.
 */
export interface EncryptedData {
    ciphertext: string;
    iv: string;
    tag: string;
}
/**
 * Get encryption key from environment variable
 * @throws Error if key is missing or invalid
 */
export declare function getEncryptionKey(): Buffer;
/**
 * Encrypt plaintext using AES-256-GCM
 * @param plainText - The text to encrypt
 * @returns EncryptedData with ciphertext, iv, and tag (all base64)
 */
export declare function encrypt(plainText: string): EncryptedData;
/**
 * Decrypt data using AES-256-GCM
 * @param data - EncryptedData containing ciphertext, iv, and tag
 * @returns Decrypted plaintext
 */
export declare function decrypt(data: EncryptedData): string;
/**
 * Encrypt plaintext and return as JSON string for storage
 * @param plainText - The text to encrypt
 * @returns JSON string containing ciphertext, iv, tag
 */
export declare function encryptForStorage(plainText: string): string;
/**
 * Decrypt from storage format (JSON string)
 * @param encryptedStr - JSON string containing ciphertext, iv, tag
 * @returns Decrypted plaintext
 */
export declare function decryptFromStorage(encryptedStr: string): string;
/**
 * Check if encryption is configured
 */
export declare function isEncryptionConfigured(): boolean;
export {};
//# sourceMappingURL=encryption.d.ts.map