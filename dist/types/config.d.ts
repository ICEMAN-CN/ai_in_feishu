export interface FeishuConfig {
    appId: string;
    appSecret: string;
    botName: string;
}
export type ModelProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama';
export interface ModelConfig {
    id: string;
    name: string;
    provider: ModelProvider;
    apiKeyEncrypted: string;
    baseUrl: string;
    modelId: string;
    isDefault: boolean;
    maxTokens: number;
    temperature: number;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Session {
    id: string;
    threadId: string;
    p2pId: string;
    modelId: string;
    systemPrompt?: string;
    messageCount: number;
    messageLimit: number;
    createdAt: string;
    updatedAt: string;
    lastMessageAt?: string;
}
export interface ConversationMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    modelId?: string;
    messageId?: string;
    createdAt: string;
}
export interface KBFolder {
    id: string;
    name: string;
    url: string;
    folderToken: string;
    lastSyncAt?: string;
    lastSyncDocCount: number;
    syncEnabled: boolean;
    createdAt: string;
}
export interface MCPToolAuth {
    toolName: string;
    enabled: boolean;
    fallbackEnabled: boolean;
    fallbackMethod?: string;
}
export interface SystemConfig {
    [key: string]: string;
}
export interface EncryptedData {
    ciphertext: string;
    iv: string;
    tag: string;
}
//# sourceMappingURL=config.d.ts.map