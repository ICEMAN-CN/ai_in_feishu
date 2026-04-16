import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getEncryptionKey, encrypt, encryptForStorage, isEncryptionConfigured } from '../../src/core/encryption';
import { saveModel, initDatabase, getDb, closeDb } from '../../src/core/config-store';

describe('EXC-006: API Key Validation Error Tests', () => {
  describe('Encryption Key Validation', () => {
    const originalEnv = process.env.ENCRYPTION_KEY;

    afterEach(() => {
      process.env.ENCRYPTION_KEY = originalEnv;
    });

    describe('getEncryptionKey()', () => {
      it('should throw when ENCRYPTION_KEY is not set', () => {
        delete process.env.ENCRYPTION_KEY;

        expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY environment variable must be set');
      });

      it('should throw when ENCRYPTION_KEY is wrong length (not 64 characters)', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(63);

        expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      });

      it('should throw when ENCRYPTION_KEY is too long', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(65);

        expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      });

      it('should throw when ENCRYPTION_KEY is not valid hexadecimal', () => {
        process.env.ENCRYPTION_KEY = 'g'.repeat(64);

        expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY must be valid hexadecimal (64 characters a-f, A-F, 0-9)');
      });

      it('should throw when ENCRYPTION_KEY contains spaces', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(32) + ' ' + 'b'.repeat(31);

        expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY must be valid hexadecimal (64 characters a-f, A-F, 0-9)');
      });

      it('should throw when ENCRYPTION_KEY contains special characters', () => {
        process.env.ENCRYPTION_KEY = '@'.repeat(64);

        expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY must be valid hexadecimal (64 characters a-f, A-F, 0-9)');
      });

      it('should return Buffer when ENCRYPTION_KEY is valid', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(64);

        const key = getEncryptionKey();

        expect(key).toBeInstanceOf(Buffer);
        expect(key.length).toBe(32);
      });

      it('should accept uppercase hex characters', () => {
        process.env.ENCRYPTION_KEY = 'A'.repeat(64);

        const key = getEncryptionKey();

        expect(key).toBeInstanceOf(Buffer);
        expect(key.length).toBe(32);
      });

      it('should accept mixed case hex characters', () => {
        process.env.ENCRYPTION_KEY = 'aAbBcCdD'.repeat(8);

        const key = getEncryptionKey();

        expect(key).toBeInstanceOf(Buffer);
        expect(key.length).toBe(32);
      });
    });

    describe('encrypt()', () => {
      it('should throw when ENCRYPTION_KEY is not set', () => {
        delete process.env.ENCRYPTION_KEY;

        expect(() => encrypt('test data')).toThrow('ENCRYPTION_KEY environment variable must be set');
      });

      it('should throw when ENCRYPTION_KEY is invalid', () => {
        process.env.ENCRYPTION_KEY = 'short';

        expect(() => encrypt('test data')).toThrow('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      });

      it('should throw when plaintext is empty', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(64);

        expect(() => encrypt('')).toThrow('plainText cannot be empty');
      });
    });

    describe('isEncryptionConfigured()', () => {
      it('should return false when ENCRYPTION_KEY is not set', () => {
        delete process.env.ENCRYPTION_KEY;

        expect(isEncryptionConfigured()).toBe(false);
      });

      it('should return false when ENCRYPTION_KEY is wrong length', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(63);

        expect(isEncryptionConfigured()).toBe(false);
      });

      it('should return false when ENCRYPTION_KEY is invalid hex', () => {
        process.env.ENCRYPTION_KEY = 'g'.repeat(64);

        expect(isEncryptionConfigured()).toBe(false);
      });

      it('should return true when ENCRYPTION_KEY is valid', () => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(64);

        expect(isEncryptionConfigured()).toBe(true);
      });
    });
  });

  describe('Config Store Model Validation', () => {
    beforeEach(() => {
      process.env.DATA_DIR = './data/test-exc-006';
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      initDatabase();
    });

    afterEach(() => {
      closeDb();
    });

    describe('saveModel()', () => {
      // Create validModel inside each test to ensure env is set
      const createValidModel = () => ({
        id: 'test-model-valid',
        name: 'Test Model',
        provider: 'openai' as const,
        apiKeyEncrypted: encryptForStorage('sk-test-key'),
        baseUrl: 'https://api.openai.com',
        modelId: 'gpt-4',
        isDefault: false,
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      it('should throw when id is missing', () => {
        const model = { ...createValidModel(), id: '' };

        expect(() => saveModel(model)).toThrow('saveModel: missing required fields (id, name, provider, apiKeyEncrypted, baseUrl, modelId)');
      });

      it('should throw when name is missing', () => {
        const model = { ...createValidModel(), name: '' };

        expect(() => saveModel(model)).toThrow('saveModel: missing required fields (id, name, provider, apiKeyEncrypted, baseUrl, modelId)');
      });

      it('should throw when provider is missing', () => {
        const model = { ...createValidModel(), provider: '' as any };

        expect(() => saveModel(model)).toThrow('saveModel: missing required fields (id, name, provider, apiKeyEncrypted, baseUrl, modelId)');
      });

      it('should throw when apiKeyEncrypted is missing', () => {
        const model = { ...createValidModel(), apiKeyEncrypted: '' };

        expect(() => saveModel(model)).toThrow('saveModel: missing required fields (id, name, provider, apiKeyEncrypted, baseUrl, modelId)');
      });

      it('should throw when baseUrl is missing', () => {
        const model = { ...createValidModel(), baseUrl: '' };

        expect(() => saveModel(model)).toThrow('saveModel: missing required fields (id, name, provider, apiKeyEncrypted, baseUrl, modelId)');
      });

      it('should throw when modelId is missing', () => {
        const model = { ...createValidModel(), modelId: '' };

        expect(() => saveModel(model)).toThrow('saveModel: missing required fields (id, name, provider, apiKeyEncrypted, baseUrl, modelId)');
      });

      it('should throw when all required fields are missing', () => {
        const model = {
          id: '',
          name: '',
          provider: '' as any,
          apiKeyEncrypted: '',
          baseUrl: '',
          modelId: '',
          isDefault: false,
          maxTokens: 4096,
          temperature: 0.7,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        expect(() => saveModel(model)).toThrow('saveModel: missing required fields (id, name, provider, apiKeyEncrypted, baseUrl, modelId)');
      });

      it('should throw when provider is invalid', () => {
        const model = { ...createValidModel(), provider: 'invalid-provider' as any };

        expect(() => saveModel(model)).toThrow('saveModel: invalid provider');
      });

      it('should throw when provider is empty string', () => {
        const model = { ...createValidModel(), provider: '' as any };

        expect(() => saveModel(model)).toThrow('saveModel: missing required fields');
      });

      it('should accept valid openai provider', () => {
        const model = { ...createValidModel(), id: 'test-openai', provider: 'openai' as const };

        expect(() => saveModel(model)).not.toThrow();
      });

      it('should accept valid anthropic provider', () => {
        const model = { ...createValidModel(), id: 'test-anthropic', provider: 'anthropic' as const };

        expect(() => saveModel(model)).not.toThrow();
      });

      it('should accept valid gemini provider', () => {
        const model = { ...createValidModel(), id: 'test-gemini', provider: 'gemini' as const };

        expect(() => saveModel(model)).not.toThrow();
      });

      it('should accept valid ollama provider', () => {
        const model = { ...createValidModel(), id: 'test-ollama', provider: 'ollama' as const };

        expect(() => saveModel(model)).not.toThrow();
      });

      it('should save valid model successfully', () => {
        const model = { ...createValidModel(), id: 'test-save-valid' };

        expect(() => saveModel(model)).not.toThrow();
      });
    });
  });
});
