/**
 * AI_Feishu Configuration Store (SQLite)
 *
 * Provides CRUD operations for models, sessions, KB folders, MCP tools, and system config.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { ModelConfig, Session, KBFolder, MCPToolAuth, SystemConfig, ConversationMessage } from '../types/config.js';

const DATA_DIR = process.env.DATA_DIR || './data';
const SQLITE_PATH = process.env.SQLITE_PATH || `${DATA_DIR}/config.db`;

let db: Database.Database | null = null;

function createDatabaseIfNotExists(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  const dbDir = dirname(SQLITE_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
}

export function initDatabase(): Database.Database {
  createDatabaseIfNotExists();
  const database = new Database(SQLITE_PATH);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  // Create schema
  database.exec(`
    -- Configuration database version
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    -- Model configuration table
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'gemini', 'ollama')),
      api_key_encrypted TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model_id TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      max_tokens INTEGER DEFAULT 4096,
      temperature REAL DEFAULT 0.7,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Session table (Thread-bound model)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      p2p_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      system_prompt TEXT,
      message_count INTEGER DEFAULT 0,
      message_limit INTEGER DEFAULT 20,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_message_at TEXT,
      FOREIGN KEY (model_id) REFERENCES models(id)
    );

    -- Knowledge base folders table
    CREATE TABLE IF NOT EXISTS kb_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      folder_token TEXT NOT NULL,
      last_sync_at TEXT,
      last_sync_doc_count INTEGER DEFAULT 0,
      sync_enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- MCP tool authorization table
    CREATE TABLE IF NOT EXISTS mcp_tool_auth (
      tool_name TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      fallback_enabled INTEGER DEFAULT 1,
      fallback_method TEXT,
      updated_at TEXT NOT NULL
    );

    -- System configuration table
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Messages table for conversation history
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      model_id TEXT,
      message_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sessions_thread ON sessions(thread_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_p2p ON sessions(p2p_id);
    CREATE INDEX IF NOT EXISTS idx_kb_folders_token ON kb_folders(folder_token);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
  `);

  // Record schema version
  const version = database.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null };
  const currentVersion = version.v || 0;

  if (currentVersion < 1) {
    database.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(1, new Date().toISOString());
  }

  return database;
}

export function getDb(): Database.Database {
  if (!db) {
    db = initDatabase();
  }
  return db;
}

// ==================== Models ====================

export function getDefaultModel(): ModelConfig | null {
  const row = getDb().prepare('SELECT * FROM models WHERE is_default = 1 AND enabled = 1').get();
  return row ? mapRowToModel(row as any) : null;
}

export function getModel(id: string): ModelConfig | null {
  const row = getDb().prepare('SELECT * FROM models WHERE id = ?').get(id);
  return row ? mapRowToModel(row as any) : null;
}

export function getAllModels(): ModelConfig[] {
  const rows = getDb().prepare('SELECT * FROM models ORDER BY created_at DESC').all();
  return rows.map((row: any) => mapRowToModel(row));
}

export function getEnabledModels(): ModelConfig[] {
  const rows = getDb().prepare('SELECT * FROM models WHERE enabled = 1 ORDER BY created_at DESC').all();
  return rows.map((row: any) => mapRowToModel(row));
}

export function saveModel(model: ModelConfig): void {
  // Validate required fields
  if (!model.id || !model.name || !model.provider || !model.apiKeyEncrypted || !model.baseUrl || !model.modelId) {
    throw new Error('saveModel: missing required fields (id, name, provider, apiKeyEncrypted, baseUrl, modelId)');
  }
  if (!['openai', 'anthropic', 'gemini', 'ollama'].includes(model.provider)) {
    throw new Error('saveModel: invalid provider');
  }

  const stmt = getDb().prepare(`
    INSERT INTO models (id, name, provider, api_key_encrypted, base_url, model_id, is_default, max_tokens, temperature, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      provider = excluded.provider,
      api_key_encrypted = excluded.api_key_encrypted,
      base_url = excluded.base_url,
      model_id = excluded.model_id,
      is_default = excluded.is_default,
      max_tokens = excluded.max_tokens,
      temperature = excluded.temperature,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    model.id,
    model.name,
    model.provider,
    model.apiKeyEncrypted,
    model.baseUrl,
    model.modelId,
    model.isDefault ? 1 : 0,
    model.maxTokens,
    model.temperature,
    model.enabled ? 1 : 0,
    model.createdAt,
    model.updatedAt
  );

  // If this model is set as default, unset other defaults
  if (model.isDefault) {
    getDb().prepare('UPDATE models SET is_default = 0 WHERE id != ?').run(model.id);
  }
}

export function deleteModel(id: string): void {
  getDb().prepare('DELETE FROM models WHERE id = ?').run(id);
}

function mapRowToModel(row: any): ModelConfig {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as ModelConfig['provider'],
    apiKeyEncrypted: row.api_key_encrypted,
    baseUrl: row.base_url,
    modelId: row.model_id,
    isDefault: row.is_default === 1,
    maxTokens: row.max_tokens,
    temperature: row.temperature,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== Sessions ====================

export function getSession(threadId: string): Session | null {
  const row = getDb().prepare('SELECT * FROM sessions WHERE thread_id = ?').get(threadId);
  return row ? mapRowToSession(row as any) : null;
}

export function getSessionByP2P(p2pId: string): Session[] {
  const rows = getDb().prepare('SELECT * FROM sessions WHERE p2p_id = ? ORDER BY last_message_at DESC').all(p2pId);
  return rows.map((row: any) => mapRowToSession(row));
}

export function saveSession(session: Session): void {
  const stmt = getDb().prepare(`
    INSERT INTO sessions (id, thread_id, p2p_id, model_id, system_prompt, message_count, message_limit, created_at, updated_at, last_message_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      model_id = excluded.model_id,
      system_prompt = excluded.system_prompt,
      message_count = excluded.message_count,
      message_limit = excluded.message_limit,
      updated_at = excluded.updated_at,
      last_message_at = excluded.last_message_at
  `);

  stmt.run(
    session.id,
    session.threadId,
    session.p2pId,
    session.modelId,
    session.systemPrompt || null,
    session.messageCount,
    session.messageLimit,
    session.createdAt,
    session.updatedAt,
    session.lastMessageAt || null
  );
}

export function deleteSession(id: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

function mapRowToSession(row: any): Session {
  return {
    id: row.id,
    threadId: row.thread_id,
    p2pId: row.p2p_id,
    modelId: row.model_id,
    systemPrompt: row.system_prompt || undefined,
    messageCount: row.message_count,
    messageLimit: row.message_limit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at || undefined,
  };
}

// ==================== KB Folders ====================

export function getKBFolder(id: string): KBFolder | null {
  const row = getDb().prepare('SELECT * FROM kb_folders WHERE id = ?').get(id);
  return row ? mapRowToKBFolder(row as any) : null;
}

export function getAllKBFolders(): KBFolder[] {
  const rows = getDb().prepare('SELECT * FROM kb_folders ORDER BY created_at DESC').all();
  return rows.map((row: any) => mapRowToKBFolder(row));
}

export function getEnabledKBFolders(): KBFolder[] {
  const rows = getDb().prepare('SELECT * FROM kb_folders WHERE sync_enabled = 1 ORDER BY created_at DESC').all();
  return rows.map((row: any) => mapRowToKBFolder(row));
}

export function saveKBFolder(folder: KBFolder): void {
  const stmt = getDb().prepare(`
    INSERT INTO kb_folders (id, name, url, folder_token, last_sync_at, last_sync_doc_count, sync_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      url = excluded.url,
      folder_token = excluded.folder_token,
      last_sync_at = excluded.last_sync_at,
      last_sync_doc_count = excluded.last_sync_doc_count,
      sync_enabled = excluded.sync_enabled
  `);

  stmt.run(
    folder.id,
    folder.name,
    folder.url,
    folder.folderToken,
    folder.lastSyncAt || null,
    folder.lastSyncDocCount,
    folder.syncEnabled ? 1 : 0,
    folder.createdAt
  );
}

export function deleteKBFolder(id: string): void {
  getDb().prepare('DELETE FROM kb_folders WHERE id = ?').run(id);
}

function mapRowToKBFolder(row: any): KBFolder {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    folderToken: row.folder_token,
    lastSyncAt: row.last_sync_at || undefined,
    lastSyncDocCount: row.last_sync_doc_count,
    syncEnabled: row.sync_enabled === 1,
    createdAt: row.created_at,
  };
}

// ==================== MCP Tool Auth ====================

export function getMCPToolAuth(toolName: string): MCPToolAuth | null {
  const row = getDb().prepare('SELECT * FROM mcp_tool_auth WHERE tool_name = ?').get(toolName);
  return row ? mapRowToMCPToolAuth(row as any) : null;
}

export function getAllMCPToolAuths(): MCPToolAuth[] {
  const rows = getDb().prepare('SELECT * FROM mcp_tool_auth').all();
  return rows.map((row: any) => mapRowToMCPToolAuth(row));
}

export function saveMCPToolAuth(auth: MCPToolAuth): void {
  const stmt = getDb().prepare(`
    INSERT INTO mcp_tool_auth (tool_name, enabled, fallback_enabled, fallback_method, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tool_name) DO UPDATE SET
      enabled = excluded.enabled,
      fallback_enabled = excluded.fallback_enabled,
      fallback_method = excluded.fallback_method,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    auth.toolName,
    auth.enabled ? 1 : 0,
    auth.fallbackEnabled ? 1 : 0,
    auth.fallbackMethod || null,
    new Date().toISOString()
  );
}

function mapRowToMCPToolAuth(row: any): MCPToolAuth {
  return {
    toolName: row.tool_name,
    enabled: row.enabled === 1,
    fallbackEnabled: row.fallback_enabled === 1,
    fallbackMethod: row.fallback_method || undefined,
  };
}

// ==================== System Config ====================

export function getSystemConfig(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSystemConfig(key: string, value: string): void {
  const stmt = getDb().prepare(`
    INSERT INTO system_config (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);
  stmt.run(key, value, new Date().toISOString());
}

export function getAllSystemConfig(): SystemConfig {
  const rows = getDb().prepare('SELECT key, value FROM system_config').all() as { key: string; value: string }[];
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as SystemConfig);
}

// ==================== Messages ====================

export interface StoredMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
  messageId?: string;
  createdAt: string;
}

export function saveMessage(message: ConversationMessage): void {
  const stmt = getDb().prepare(`
    INSERT INTO messages (id, session_id, role, content, model_id, message_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content = excluded.content,
      message_id = excluded.message_id
  `);

  stmt.run(
    message.id,
    message.sessionId,
    message.role,
    message.content,
    message.modelId || null,
    message.messageId || null,
    message.createdAt
  );
}

export function getMessagesBySession(sessionId: string, limit?: number): ConversationMessage[] {
  let query = 'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC';
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  const rows = getDb().prepare(query).all(sessionId) as any[];
  return rows.map(mapRowToMessage);
}

export function deleteMessagesBySession(sessionId: string, keepCount: number = 0): number {
  if (keepCount <= 0) {
    const result = getDb().prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
    return result.changes;
  }

  const toDelete = getDb().prepare(`
    SELECT id FROM messages 
    WHERE session_id = ? 
    ORDER BY created_at ASC 
    LIMIT (SELECT MAX(0, COUNT(*) - ?) FROM messages WHERE session_id = ?)
  `).all(sessionId, keepCount, sessionId) as { id: string }[];

  if (toDelete.length === 0) return 0;

  const placeholders = toDelete.map(() => '?').join(',');
  const result = getDb().prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).run(...toDelete.map(m => m.id));
  return result.changes;
}

function mapRowToMessage(row: any): ConversationMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content,
    modelId: row.model_id || undefined,
    messageId: row.message_id || undefined,
    createdAt: row.created_at,
  };
}

// ==================== Utility ====================

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export {};
