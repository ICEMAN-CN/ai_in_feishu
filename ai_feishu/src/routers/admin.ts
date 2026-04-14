import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { encryptForStorage } from '../core/encryption';
import { getAllModels, saveModel, deleteModel, getModel } from '../core/config-store';
import type { ModelConfig, ModelProvider } from '../types/config';

const admin = new Hono();

interface CreateModelBody {
  name: string;
  provider: ModelProvider;
  apiKey: string;
  baseUrl?: string;
  modelId: string;
  isDefault?: boolean;
  maxTokens?: number;
  temperature?: number;
}

interface UpdateModelBody {
  name?: string;
  apiKey?: string;
  isDefault?: boolean;
  maxTokens?: number;
  temperature?: number;
  enabled?: boolean;
}

admin.get('/models', (c) => {
  const models = getAllModels();
  return c.json({
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      modelId: m.modelId,
      baseUrl: m.baseUrl,
      isDefault: m.isDefault,
      maxTokens: m.maxTokens,
      temperature: m.temperature,
      enabled: m.enabled,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  });
});

admin.get('/models/:id', (c) => {
  const id = c.req.param('id');
  const model = getModel(id);
  
  if (!model) {
    return c.json({ success: false, message: 'Model not found' }, 404);
  }
  
  return c.json({
    model: {
      id: model.id,
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      baseUrl: model.baseUrl,
      isDefault: model.isDefault,
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      enabled: model.enabled,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    },
  });
});

admin.post('/models', async (c) => {
  const body = await c.req.json<CreateModelBody>();
  const { name, provider, apiKey, baseUrl, modelId, isDefault, maxTokens, temperature } = body;

  if (!name || !provider || !apiKey || !modelId) {
    return c.json({ success: false, message: 'Missing required fields: name, provider, apiKey, modelId' }, 400);
  }

  const validProviders: ModelProvider[] = ['openai', 'anthropic', 'gemini', 'ollama'];
  if (!validProviders.includes(provider)) {
    return c.json({ success: false, message: `Invalid provider. Must be one of: ${validProviders.join(', ')}` }, 400);
  }

  const encryptedKey = encryptForStorage(apiKey);
  const id = uuidv4();
  const now = new Date().toISOString();

  const modelConfig: ModelConfig = {
    id,
    name,
    provider,
    apiKeyEncrypted: encryptedKey,
    baseUrl: baseUrl || getDefaultBaseUrl(provider),
    modelId,
    isDefault: isDefault || false,
    maxTokens: maxTokens || 4096,
    temperature: temperature || 0.7,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  saveModel(modelConfig);

  return c.json({ id, success: true }, 201);
});

admin.put('/models/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<UpdateModelBody>();

  const existing = getModel(id);
  if (!existing) {
    return c.json({ success: false, message: 'Model not found' }, 404);
  }

  const updates: Partial<ModelConfig> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.name) {
    updates.name = body.name;
  }
  if (body.apiKey) {
    updates.apiKeyEncrypted = encryptForStorage(body.apiKey);
  }
  if (body.maxTokens !== undefined) {
    updates.maxTokens = body.maxTokens;
  }
  if (body.temperature !== undefined) {
    updates.temperature = body.temperature;
  }
  if (body.enabled !== undefined) {
    updates.enabled = body.enabled;
  }
  if (body.isDefault !== undefined) {
    updates.isDefault = body.isDefault;
  }

  const updatedModel: ModelConfig = {
    ...existing,
    ...updates,
  };

  saveModel(updatedModel);

  return c.json({ success: true });
});

admin.delete('/models/:id', (c) => {
  const id = c.req.param('id');

  const existing = getModel(id);
  if (!existing) {
    return c.json({ success: false, message: 'Model not found' }, 404);
  }

  deleteModel(id);

  return c.json({ success: true });
});

function getDefaultBaseUrl(provider: ModelProvider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1';
    case 'ollama':
      return 'http://localhost:11434';
    default:
      return '';
  }
}

export default admin;
