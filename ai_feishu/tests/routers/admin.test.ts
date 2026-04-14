import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import adminRouter from '../../src/routers/admin';
import * as configStore from '../../src/core/config-store';
import * as encryption from '../../src/core/encryption';
import type { ModelConfig } from '../../src/types/config';

vi.mock('../../src/core/config-store');
vi.mock('../../src/core/encryption');

describe('Admin API', () => {
  let app: Hono;

  const mockModel: ModelConfig = {
    id: 'model-001',
    name: 'GPT-4o',
    provider: 'openai',
    apiKeyEncrypted: '{"ciphertext":"xxx","iv":"yyy","tag":"zzz"}',
    baseUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4o',
    isDefault: true,
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    app = new Hono();
    app.route('/api/admin', adminRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/admin/models', () => {
    it('TC-3.5-001: should return all models', async () => {
      vi.mocked(configStore.getAllModels).mockReturnValue([mockModel]);

      const res = await app.request('/api/admin/models');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.models).toHaveLength(1);
      expect(body.models[0].id).toBe('model-001');
      expect(body.models[0].name).toBe('GPT-4o');
      expect(body.models[0].provider).toBe('openai');
      expect(configStore.getAllModels).toHaveBeenCalled();
    });

    it('should return empty array when no models', async () => {
      vi.mocked(configStore.getAllModels).mockReturnValue([]);

      const res = await app.request('/api/admin/models');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.models).toHaveLength(0);
    });
  });

  describe('GET /api/admin/models/:id', () => {
    it('should return model by id', async () => {
      vi.mocked(configStore.getModel).mockReturnValue(mockModel);

      const res = await app.request('/api/admin/models/model-001');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.model.id).toBe('model-001');
    });

    it('should return 404 when model not found', async () => {
      vi.mocked(configStore.getModel).mockReturnValue(null);

      const res = await app.request('/api/admin/models/invalid-id');
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Model not found');
    });
  });

  describe('POST /api/admin/models', () => {
    it('TC-3.5-002: should create model with encrypted API key', async () => {
      vi.mocked(encryption.encryptForStorage).mockReturnValue('encrypted-key');
      vi.mocked(configStore.saveModel).mockReturnValue();

      const res = await app.request('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'GPT-4o',
          provider: 'openai',
          apiKey: 'sk-test-key',
          modelId: 'gpt-4o',
          isDefault: true,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.id).toBeDefined();
      expect(encryption.encryptForStorage).toHaveBeenCalledWith('sk-test-key');
      expect(configStore.saveModel).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const res = await app.request('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'GPT-4o',
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should return 400 for invalid provider', async () => {
      const res = await app.request('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          provider: 'invalid-provider',
          apiKey: 'key',
          modelId: 'model',
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toContain('Invalid provider');
    });

    it('should use default baseUrl based on provider', async () => {
      vi.mocked(encryption.encryptForStorage).mockReturnValue('encrypted-key');
      vi.mocked(configStore.saveModel).mockReturnValue();

      const res = await app.request('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Claude',
          provider: 'anthropic',
          apiKey: 'sk-ant-key',
          modelId: 'claude-3-opus',
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(configStore.saveModel).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://api.anthropic.com',
        })
      );
    });
  });

  describe('PUT /api/admin/models/:id', () => {
    it('TC-3.5-003: should update model and handle default toggle', async () => {
      vi.mocked(configStore.getModel).mockReturnValue(mockModel);
      vi.mocked(configStore.saveModel).mockReturnValue();

      const res = await app.request('/api/admin/models/model-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'GPT-4o-Updated',
          maxTokens: 8192,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(configStore.saveModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'GPT-4o-Updated',
          maxTokens: 8192,
        })
      );
    });

    it('should encrypt new API key when provided', async () => {
      vi.mocked(configStore.getModel).mockReturnValue(mockModel);
      vi.mocked(encryption.encryptForStorage).mockReturnValue('new-encrypted-key');
      vi.mocked(configStore.saveModel).mockReturnValue();

      const res = await app.request('/api/admin/models/model-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'new-sk-key',
        }),
      });

      expect(res.status).toBe(200);
      expect(encryption.encryptForStorage).toHaveBeenCalledWith('new-sk-key');
    });

    it('should return 404 when model not found', async () => {
      vi.mocked(configStore.getModel).mockReturnValue(null);

      const res = await app.request('/api/admin/models/invalid-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/models/:id', () => {
    it('TC-3.5-004: should delete model', async () => {
      vi.mocked(configStore.getModel).mockReturnValue(mockModel);
      vi.mocked(configStore.deleteModel).mockReturnValue();

      const res = await app.request('/api/admin/models/model-001', {
        method: 'DELETE',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(configStore.deleteModel).toHaveBeenCalledWith('model-001');
    });

    it('should return 404 when model not found', async () => {
      vi.mocked(configStore.getModel).mockReturnValue(null);

      const res = await app.request('/api/admin/models/invalid-id', {
        method: 'DELETE',
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });
});
