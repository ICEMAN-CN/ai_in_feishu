import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, encryptForStorage, isEncryptionConfigured } from '../../src/core/encryption';
import { getDb, saveModel, getModel, getAllModels, deleteModel, initDatabase } from '../../src/core/config-store';
import { SECURITY_CONFIG } from './config';

describe('SEC-001: API Key Encryption in Database', () => {
  beforeEach(() => {
    process.env.DATA_DIR = './data/test-security';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    initDatabase();
  });

  afterEach(() => {
    const db = getDb();
    db.close();
  });

  it('should encrypt API key before storing in database', () => {
    const plaintextKey = 'sk-test12345678901234567890';
    const encrypted = encryptForStorage(plaintextKey);

    const model = {
      id: 'test-model-sec-001',
      name: 'Test Model',
      provider: 'openai' as const,
      apiKeyEncrypted: encrypted,
      baseUrl: 'https://api.openai.com',
      modelId: 'gpt-4',
      isDefault: false,
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveModel(model);

    const retrieved = getModel('test-model-sec-001');

    expect(retrieved?.apiKeyEncrypted).not.toBe(plaintextKey);

    const parsed = JSON.parse(retrieved?.apiKeyEncrypted || '{}');
    expect(parsed).toHaveProperty('ciphertext');
    expect(parsed).toHaveProperty('iv');
    expect(parsed).toHaveProperty('tag');
  });

  it('should NOT store plaintext API keys in database', () => {
    const plaintextKey = 'sk-ant-api12345678901234567890';
    const encrypted = encryptForStorage(plaintextKey);

    const model = {
      id: 'test-model-sec-001-2',
      name: 'Test Model 2',
      provider: 'anthropic' as const,
      apiKeyEncrypted: encrypted,
      baseUrl: 'https://api.anthropic.com',
      modelId: 'claude-3',
      isDefault: false,
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveModel(model);

    const db = getDb();
    const row = db.prepare('SELECT api_key_encrypted FROM models WHERE id = ?').get('test-model-sec-001-2') as { api_key_encrypted: string };

    for (const pattern of SECURITY_CONFIG.ENCRYPTION.PLAINTEXT_PATTERNS) {
      expect(row.api_key_encrypted).not.toMatch(pattern);
    }

    const parsed = JSON.parse(row.api_key_encrypted);
    expect(parsed.ciphertext).toBeTruthy();
    expect(parsed.iv).toBeTruthy();
    expect(parsed.tag).toBeTruthy();
  });

  it('should re-encrypt API key when updating model', () => {
    const key1 = encryptForStorage('sk-first-key-12345678901234567890');
    saveModel({
      id: 'test-model-sec-001-3',
      name: 'Test Model 3',
      provider: 'openai' as const,
      apiKeyEncrypted: key1,
      baseUrl: 'https://api.openai.com',
      modelId: 'gpt-4',
      isDefault: false,
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const before = getModel('test-model-sec-001-3');

    const key2 = encryptForStorage('sk-second-key-09876543210987654321');
    saveModel({
      ...before!,
      apiKeyEncrypted: key2,
      updatedAt: new Date().toISOString(),
    });

    const after = getModel('test-model-sec-001-3');

    expect(JSON.parse(before!.apiKeyEncrypted)).not.toEqual(JSON.parse(after!.apiKeyEncrypted));
    expect(JSON.parse(after!.apiKeyEncrypted)).toHaveProperty('ciphertext');
  });
});