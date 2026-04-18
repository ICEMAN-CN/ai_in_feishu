import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../../src/core/session-manager';
import { initDatabase, saveModel, getSession, getDb } from '../../src/core/config-store';

describe('EXC-009: Thread Not Exist Error', () => {
  let db: ReturnType<typeof initDatabase>;
  let sessionManager: SessionManager;

  beforeEach(() => {
    process.env.DATA_DIR = './data/test-exc-009';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    db = initDatabase();
    sessionManager = new SessionManager(getDb());

    const testModel = {
      id: 'test-model-exc-009',
      name: 'Test Model',
      provider: 'openai' as const,
      apiKeyEncrypted: 'encrypted-key',
      baseUrl: 'https://api.openai.com',
      modelId: 'gpt-4',
      isDefault: true,
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveModel(testModel);
  });

  afterEach(() => {
    db.close();
  });

  describe('getSessionByThreadId', () => {
    it('should return null for non-existent thread', () => {
      expect(sessionManager.getSessionByThreadId('non-existent-thread-id')).toBeNull();
    });

    it('should return null for empty string thread ID', () => {
      expect(sessionManager.getSessionByThreadId('')).toBeNull();
    });

    it('should return null for malformed UUID', () => {
      expect(sessionManager.getSessionByThreadId('not-a-valid-uuid')).toBeNull();
    });

    it('should return session for existing thread', async () => {
      const threadId = 'existing-thread-123';
      const p2pId = 'test-p2p';

      await sessionManager.createOrGetSession(p2pId, threadId);

      const result = sessionManager.getSessionByThreadId(threadId);
      expect(result).not.toBeNull();
      expect(result?.threadId).toBe(threadId);
      expect(result?.p2pId).toBe(p2pId);
    });
  });

  describe('config-store getSession', () => {
    it('should return null for non-existent thread via getSession', () => {
      expect(getSession('non-existent-thread')).toBeNull();
    });

    it('should return null for thread that was never created', () => {
      expect(getSession('never-created-thread-id')).toBeNull();
    });
  });

  describe('createOrGetSession error handling', () => {
    it('should throw when parentId != rootId and thread does not exist', async () => {
      await expect(
        sessionManager.createOrGetSession('test-p2p', 'non-existent-root', 'non-existent-parent')
      ).rejects.toThrow(/Thread不存在/);
    });

    it('should throw with correct error message format', async () => {
      const rootId = 'my-root-id';
      const parentId = 'my-parent-id';

      await expect(
        sessionManager.createOrGetSession('test-p2p', rootId, parentId)
      ).rejects.toThrow(`Thread不存在: rootId=${rootId}, parentId=${parentId}`);
    });

    it('should create session when parentId equals rootId even for new thread', async () => {
      const p2pId = 'test-p2p';
      const rootId = 'new-thread-id';

      const result = await sessionManager.createOrGetSession(p2pId, rootId, rootId);

      expect(result).not.toBeNull();
      expect(result?.threadId).toBe(rootId);
    });

    it('should return existing session when thread already exists', async () => {
      const p2pId = 'test-p2p';
      const threadId = 'existing-thread';

      const session1 = await sessionManager.createOrGetSession(p2pId, threadId, threadId);
      const session2 = await sessionManager.createOrGetSession(p2pId, threadId, threadId);

      expect(session1?.id).toBe(session2?.id);
      expect(session1?.threadId).toBe(session2?.threadId);
    });

    it('should throw when rootId does not exist and parentId is different', async () => {
      await expect(
        sessionManager.createOrGetSession('test-p2p', 'root-thread-xyz', 'different-parent-abc')
      ).rejects.toThrow();
    });
  });

  describe('session isolation for non-existent threads', () => {
    it('should not leak session data for non-existent threads', async () => {
      await sessionManager.createOrGetSession('user-1', 'real-thread-1', 'real-thread-1');

      expect(sessionManager.getSessionByThreadId('fake-thread-1')).toBeNull();
      expect(sessionManager.getSessionByThreadId('fake-thread-2')).toBeNull();
      expect(getSession('fake-thread-3')).toBeNull();
    });

    it('should isolate sessions by thread ID', async () => {
      await sessionManager.createOrGetSession('user-a', 'thread-a', 'thread-a');
      await sessionManager.createOrGetSession('user-b', 'thread-b', 'thread-b');

      const sessionA = sessionManager.getSessionByThreadId('thread-a');
      const sessionB = sessionManager.getSessionByThreadId('thread-b');

      expect(sessionA?.p2pId).toBe('user-a');
      expect(sessionB?.p2pId).toBe('user-b');
      expect(sessionA?.id).not.toBe(sessionB?.id);
    });
  });
});
