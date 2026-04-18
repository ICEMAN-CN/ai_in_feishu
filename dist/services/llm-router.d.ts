import { CoreMessage } from 'ai';
import { ToolRegistry } from '../tools/index';
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
export declare class LLMRouter {
    private defaultModelId;
    private modelConfigs;
    private tools;
    constructor();
    private loadModels;
    private createProvider;
    getModel(modelId?: string): any;
    getModelConfig(modelId: string): ModelProviderConfig | null;
    getModelName(modelId: string): string;
    getDefaultModelId(): string | null;
    streamGenerate(modelId: string, messages: CoreMessage[], systemPrompt?: string): AsyncGenerator<string>;
    generate(modelId: string, messages: CoreMessage[], systemPrompt?: string): Promise<string>;
    setToolRegistry(registry: ToolRegistry): void;
    executeTool(toolName: string, args: any): Promise<string>;
}
export {};
//# sourceMappingURL=llm-router.d.ts.map