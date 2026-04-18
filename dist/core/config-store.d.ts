/**
 * AI_Feishu Configuration Store (SQLite)
 *
 * Provides CRUD operations for models, sessions, KB folders, MCP tools, and system config.
 */
import Database from 'better-sqlite3';
import { ModelConfig, Session, KBFolder, MCPToolAuth, SystemConfig, ConversationMessage } from '../types/config.js';
export declare function initDatabase(): Database.Database;
export declare function getDb(): Database.Database;
export declare function getDefaultModel(): ModelConfig | null;
export declare function getModel(id: string): ModelConfig | null;
export declare function getAllModels(): ModelConfig[];
export declare function getEnabledModels(): ModelConfig[];
export declare function saveModel(model: ModelConfig): void;
export declare function deleteModel(id: string): void;
export declare function getSession(threadId: string): Session | null;
export declare function getSessionByP2P(p2pId: string): Session[];
export declare function saveSession(session: Session): void;
export declare function deleteSession(id: string): void;
export declare function getKBFolder(id: string): KBFolder | null;
export declare function getAllKBFolders(): KBFolder[];
export declare function getEnabledKBFolders(): KBFolder[];
export declare function saveKBFolder(folder: KBFolder): void;
export declare function deleteKBFolder(id: string): void;
export declare function getMCPToolAuth(toolName: string): MCPToolAuth | null;
export declare function getAllMCPToolAuths(): MCPToolAuth[];
export declare function saveMCPToolAuth(auth: MCPToolAuth): void;
export declare function getSystemConfig(key: string): string | null;
export declare function setSystemConfig(key: string, value: string): void;
export declare function getAllSystemConfig(): SystemConfig;
export interface StoredMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    modelId?: string;
    messageId?: string;
    createdAt: string;
}
export declare function saveMessage(message: ConversationMessage): void;
export declare function getMessagesBySession(sessionId: string, limit?: number): ConversationMessage[];
export declare function deleteMessagesBySession(sessionId: string, keepCount?: number): number;
export declare function closeDb(): void;
export {};
//# sourceMappingURL=config-store.d.ts.map