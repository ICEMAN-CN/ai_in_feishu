import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { decryptFromStorage } from '../core/encryption';
import { getEnabledModels } from '../core/config-store';
import { logger } from '../core/logger';
function mapDbProviderToSdkProvider(dbProvider) {
    return dbProvider === 'gemini' ? 'google' : dbProvider;
}
export class LLMRouter {
    defaultModelId = null;
    modelConfigs = new Map();
    tools = new Map();
    constructor() {
        this.loadModels();
    }
    loadModels() {
        const models = getEnabledModels();
        for (const model of models) {
            try {
                const apiKey = model.apiKeyEncrypted
                    ? decryptFromStorage(model.apiKeyEncrypted)
                    : '';
                const sdkProvider = mapDbProviderToSdkProvider(model.provider);
                const config = {
                    id: model.id,
                    name: model.name,
                    provider: sdkProvider,
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
            }
            catch (error) {
                logger.error('LLMRouter', `Failed to load model ${model.name}:`, error);
            }
        }
    }
    createProvider(config) {
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
    getModel(modelId) {
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
    getModelConfig(modelId) {
        return this.modelConfigs.get(modelId) || null;
    }
    getModelName(modelId) {
        const config = this.modelConfigs.get(modelId);
        return config?.name || 'Unknown';
    }
    getDefaultModelId() {
        return this.defaultModelId;
    }
    async *streamGenerate(modelId, messages, systemPrompt) {
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
    async generate(modelId, messages, systemPrompt) {
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
    setToolRegistry(registry) {
        for (const tool of registry.getTools()) {
            this.tools.set(tool.name, tool);
        }
    }
    async executeTool(toolName, args) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }
        return await tool.handler(args);
    }
}
//# sourceMappingURL=llm-router.js.map