// AI_Feishu Configuration Types

// ==================== Feishu ====================

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  botName: string;
}

// ==================== Model ====================

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

// ==================== Session ====================

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

// ==================== Knowledge Base ====================

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

// ==================== MCP ====================

export interface MCPToolAuth {
  toolName: string;
  enabled: boolean;
  fallbackEnabled: boolean;
  fallbackMethod?: string;
}

// ==================== System ====================

export interface SystemConfig {
  [key: string]: string;
}

// ==================== Encrypted Data ====================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}
