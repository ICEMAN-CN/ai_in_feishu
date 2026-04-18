import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { encryptForStorage } from '../core/encryption';
import { generateToken, isValidAdminSessionToken } from '../core/token';
import { logger } from '../core/logger';
import { getAllModels, saveModel, deleteModel, getModel, getSystemConfig, setSystemConfig } from '../core/config-store';
import type { ModelConfig, ModelProvider } from '../types/config';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
if (!ADMIN_API_KEY) {
  throw new Error('ADMIN_API_KEY environment variable is required');
}

async function authMiddleware(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  let providedKey = authHeader?.replace('Bearer ', '');

  if (!providedKey) {
    providedKey = c.req.header('X-Admin-API-Key');
  }

  if (
    !providedKey ||
    (providedKey !== ADMIN_API_KEY && !isValidAdminSessionToken(providedKey))
  ) {
    return c.json({ success: false, message: 'Unauthorized: Invalid or missing API key' }, { status: 401 });
  }

  await next();
}

const admin = new Hono();

admin.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { apiKey } = body;

  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return c.json({ success: false, message: 'Invalid API key' }, { status: 401 });
  }

  const { token, expiresAt } = generateToken();
  return c.json({ success: true, token, expiresAt });
});

admin.use('*', authMiddleware);

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

interface FeishuConfigResponse {
  appId: string;
  appSecret: string;
}

interface MCPConfigResponse {
  serverUrl: string;
  fallbackEnabled: boolean;
}

interface ConfigResponse {
  feishu: FeishuConfigResponse;
  mcp: MCPConfigResponse;
}

interface UpdateFeishuConfigBody {
  appId?: string;
  appSecret?: string;
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

admin.get('/config', (c) => {
  const feishuAppId = process.env.FEISHU_APP_ID || getSystemConfig('feishu_app_id') || '';
  const mcpFallbackEnabled = getSystemConfig('mcp_fallback_enabled') === 'true';
  const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000';

  return c.json({
    feishu: {
      appId: feishuAppId,
      appSecret: '***',
    },
    mcp: {
      serverUrl: mcpServerUrl,
      fallbackEnabled: mcpFallbackEnabled,
    },
  });
});

admin.put('/config/feishu', async (c) => {
  const body = await c.req.json<UpdateFeishuConfigBody>();
  const { appId, appSecret } = body;

  if (!appId && !appSecret) {
    return c.json({ success: false, message: 'At least one of appId or appSecret must be provided' }, 400);
  }

  if (appId) {
    setSystemConfig('feishu_app_id', appId.trim());
  }

  if (appSecret && appSecret.trim()) {
    const encryptedSecret = encryptForStorage(appSecret.trim());
    setSystemConfig('feishu_app_secret_encrypted', encryptedSecret);
  }

  return c.json({ success: true, message: 'Feishu config updated. Restart the app for changes to take effect.' });
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
