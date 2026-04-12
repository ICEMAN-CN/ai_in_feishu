import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionManager } from '../src/core/session-manager';

describe('SessionManager', () => {
  let db: Database.Database;
  let sessionManager: SessionManager;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL UNIQUE,
        p2p_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        system_prompt TEXT,
        message_count INTEGER DEFAULT 0,
        message_limit INTEGER DEFAULT 20,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_message_at TEXT
      );
      CREATE TABLE models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
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
      INSERT INTO models (id, name, provider, api_key_encrypted, base_url, model_id, is_default, max_tokens, temperature, enabled, created_at, updated_at)
      VALUES ('default-model', 'Default Model', 'openai', 'encrypted', 'https://api.openai.com', 'gpt-4', 1, 4096, 0.7, 1, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
    `);
    sessionManager = new SessionManager(db);
  });

  describe('createOrGetSession()', () => {
    it('TC-3.1-001: should create new session when rootId is empty', async () => {
      const session = await sessionManager.createOrGetSession('p2p_123');
      expect(session.p2pId).toBe('p2p_123');
      expect(session.threadId).toBeDefined();
      expect(session.messageCount).toBe(0);
    });

    it('TC-3.1-002: should return existing session when threadId exists', async () => {
      const session1 = await sessionManager.createOrGetSession('p2p_123', 'thread_abc');
      const session2 = await sessionManager.createOrGetSession('p2p_123', 'thread_abc');
      expect(session1.id).toBe(session2.id);
    });

    it('TC-3.1-003: should throw error when parentId exists but thread does not', async () => {
      await expect(
        sessionManager.createOrGetSession('p2p_123', 'nonexistent', 'parent_123')
      ).rejects.toThrow('Thread不存在');
    });
  });

  describe('updateSessionMessage()', () => {
    it('TC-3.1-004: should increment message count', async () => {
      const session = await sessionManager.createOrGetSession('p2p_123');
      sessionManager.updateSessionMessage(session.id, 1);

      const updated = sessionManager.getSessionByThreadId(session.threadId);
      expect(updated?.messageCount).toBe(1);
    });
  });
});