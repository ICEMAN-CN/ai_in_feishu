import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, initDatabase, saveModel, getModel, getSession, getKBFolder, deleteModel, deleteSession, deleteKBFolder } from '../../src/core/config-store';
import { SECURITY_CONFIG } from './config';

describe('SEC-004: SQL Injection Prevention', () => {
  beforeEach(() => {
    process.env.DATA_DIR = './data/test-security';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    initDatabase();

    const model = {
      id: 'test-model-sql',
      name: 'Test Model',
      provider: 'openai' as const,
      apiKeyEncrypted: JSON.stringify({ ciphertext: 'test', iv: 'test', tag: 'test' }),
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
  });

  afterEach(() => {
    const db = getDb();
    db.close();
  });

  it('should safely handle SQL injection in model ID lookup', () => {
    const maliciousInput = "' OR '1'='1";

    const result = getModel(maliciousInput);

    expect(result).toBeNull();
  });

  it('should safely handle SQL injection in session lookup', async () => {
    const session = {
      id: 'test-session-sql',
      threadId: 'test-thread-sql',
      p2pId: 'test-p2p-sql',
      modelId: 'test-model-sql',
      messageCount: 0,
      messageLimit: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { saveSession } = await import('../../src/core/config-store');
    saveSession(session);

    const maliciousThreadId = "' OR '1'='1";
    const result = getSession(maliciousThreadId);

    expect(result).toBeNull();
  });

  it('should safely handle SQL injection in KB folder lookup', () => {
    const maliciousInput = "'; DROP TABLE models;--";

    const result = getKBFolder(maliciousInput);

    expect(result).toBeNull();

    const db = getDb();
    const models = db.prepare('SELECT COUNT(*) as count FROM models').get() as { count: number };
    expect(models.count).toBeGreaterThan(0);
  });

  it('should safely handle multiple SQL injection patterns', () => {
    const db = getDb();

    for (const payload of SECURITY_CONFIG.SQL_INJECTION.PAYLOADS) {
      expect(() => {
        getModel(payload);
      }).not.toThrow();

      expect(getModel(payload)).toBeNull();
    }

    const version = db.prepare('SELECT MAX(version) as v FROM schema_version').get();
    expect(version).toBeTruthy();
  });

  it('should use parameterized queries for all user inputs', async () => {
    const session = {
      id: 'test-session-param',
      threadId: 'thread-param-123',
      p2pId: 'p2p-param-456',
      modelId: 'test-model-sql',
      messageCount: 0,
      messageLimit: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { saveSession } = await import('../../src/core/config-store');
    saveSession(session);

    const result = getSession('thread-param-123');
    expect(result).not.toBeNull();
    expect(result?.threadId).toBe('thread-param-123');

    expect(getSession("' OR '1'='1")).toBeNull();
    expect(getSession("admin'--")).toBeNull();
  });
});