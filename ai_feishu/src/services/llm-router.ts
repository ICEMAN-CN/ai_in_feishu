import { generateText, streamText, CoreMessage } from 'ai';
import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { decryptFromStorage } from '../core/encryption';
import { getEnabledModels } from '../core/config-store';
import { logger } from '../core/logger';
import { AITool, ToolRegistry } from '../tools/index';

export interface ModelProviderConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama';
  apiKey: string;
  baseUrl: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}

function mapDbProviderToSdkProvider(dbProvider: string): string {
  return dbProvider === 'gemini' ? 'google' : dbProvider;
}

export class LLMRouter {
  private defaultModelId: string | null = null;
  private modelConfigs: Map<string, ModelProviderConfig> = new Map();
  private tools: Map<string, AITool> = new Map();

  constructor() {
    this.loadModels();
  }

  private loadModels(): void {
    const models = getEnabledModels();

    for (const model of models) {
      try {
        const apiKey = model.apiKeyEncrypted
          ? decryptFromStorage(model.apiKeyEncrypted)
          : '';

        const sdkProvider = mapDbProviderToSdkProvider(model.provider);

        const config: ModelProviderConfig = {
          id: model.id,
          name: model.name,
          provider: sdkProvider as ModelProviderConfig['provider'],
          apiKey,
          baseUrl: model.baseUrl,
          modelId: model.modelId,
          maxTokens: model.maxTokens,
          temperature: model.temperature,
        };

        this.modelConfigs.set(model.id, config);

        if (model.isDefault) {
          this.defaultModelId = model.id;
        }
      } catch (error) {
        logger.error('LLMRouter', `Failed to load model ${model.name}:`, error);
      }
    }
  }

  private createProvider(config: ModelProviderConfig): OpenAIProvider | AnthropicProvider | GoogleGenerativeAIProvider {
    const { provider, apiKey, baseUrl } = config;

    switch (provider) {
      case 'openai':
        return createOpenAI({ apiKey, baseURL: baseUrl });
      case 'anthropic':
        return createAnthropic({ apiKey });
      case 'google':
        return createGoogleGenerativeAI({ apiKey });
      case 'ollama':
        return createOpenAI({ apiKey: '', baseURL: baseUrl });
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  getModel(modelId?: string): any {
    const id = modelId || this.defaultModelId;
    if (!id) {
      throw new Error('No model available');
    }

    const config = this.modelConfigs.get(id);
    if (!config) {
      throw new Error(`Model not found: ${id}`);
    }

    const provider = this.createProvider(config);
    return provider(config.modelId);
  }

  getModelConfig(modelId: string): ModelProviderConfig | null {
    return this.modelConfigs.get(modelId) || null;
  }

  getModelName(modelId: string): string {
    const config = this.modelConfigs.get(modelId);
    return config?.name || 'Unknown';
  }

  getDefaultModelId(): string | null {
    return this.defaultModelId;
  }

  async *streamGenerate(
    modelId: string,
    messages: CoreMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const model = this.getModel(modelId);
    const config = this.modelConfigs.get(modelId);

    const result = await streamText({
      model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      maxTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7,
    });

    for await (const delta of result.fullStream) {
      if (delta.type === 'text-delta') {
        yield delta.textDelta;
      }
    }
  }

  async generate(
    modelId: string,
    messages: CoreMessage[],
    systemPrompt?: string
  ): Promise<string> {
    const model = this.getModel(modelId);
    const config = this.modelConfigs.get(modelId);

    const result = await generateText({
      model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      maxTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7,
    });

    return result.text;
  }

  setToolRegistry(registry: ToolRegistry): void {
    for (const tool of registry.getTools()) {
      this.tools.set(tool.name, tool);
    }
  }

  async executeTool(toolName: string, args: any): Promise<string> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    return await tool.handler(args);
  }
}

export {};