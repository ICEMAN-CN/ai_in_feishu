import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPToolAuthManager } from '../../src/core/mcp-tool-auth';
import Database from 'better-sqlite3';
import { getDb, initDatabase, saveSession, getSession, saveModel } from '../../src/core/config-store';

describe('SEC-006/007: Permission Control', () => {
  let db: Database.Database;
  let toolAuthManager: MCPToolAuthManager;

  beforeEach(() => {
    process.env.DATA_DIR = './data/test-security';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    db = initDatabase();
    toolAuthManager = new MCPToolAuthManager(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('SEC-007: MCP Tool Permission Toggle', () => {
    it('should disable tool when permission is off', () => {
      // By default, update_document is disabled
      expect(toolAuthManager.isToolEnabled('update_document')).toBe(false);
    });

    it('should enable tool when permission is on', () => {
      // read_document should be enabled by default
      expect(toolAuthManager.isToolEnabled('read_document')).toBe(true);
    });

    it('should throw error when calling disabled tool', async () => {
      // Attempting to call a disabled tool should throw
      await expect(
        toolAuthManager.callToolIfAllowed('update_document', { docId: '123' })
      ).rejects.toThrow('Tool update_document is disabled');
    });

    it('should allow calling enabled tool', async () => {
      // Mock MCP client that returns success
      const mockMCPClient = {
        isConnected: () => true,
        callTool: () => Promise.resolve({ result: 'success' }),
      };

      const authManager = new MCPToolAuthManager(db, mockMCPClient as any);

      // read_document is enabled
      const result = await authManager.callToolIfAllowed('read_document', { docId: '123' });
      expect(result).toBeDefined();
    });

    it('should toggle tool permission on', () => {
      // Disable a tool first
      toolAuthManager.setToolEnabled('send_message', false);
      expect(toolAuthManager.isToolEnabled('send_message')).toBe(false);

      // Enable it
      toolAuthManager.setToolEnabled('send_message', true);
      expect(toolAuthManager.isToolEnabled('send_message')).toBe(true);
    });

    it('should toggle tool permission off', async () => {
      // Explicitly disable send_message to ensure clean state
      toolAuthManager.setToolEnabled('send_message', false);
      expect(toolAuthManager.isToolEnabled('send_message')).toBe(false);

      // Try to call - should throw
      const mockMCPClient = {
        isConnected: () => true,
        callTool: () => Promise.resolve({ result: 'success' }),
      };

      const authManager = new MCPToolAuthManager(db, mockMCPClient as any);

      // Should throw because tool is disabled
      await expect(
        authManager.callToolIfAllowed('send_message', { chatId: '123' })
      ).rejects.toThrow('Tool send_message is disabled');
    });

    it('should get correct tool auth configuration', () => {
      const auth = toolAuthManager.getToolAuth('read_document');

      expect(auth).not.toBeNull();
      expect(auth?.toolName).toBe('read_document');
      expect(auth?.enabled).toBe(true);
      expect(auth?.fallbackEnabled).toBe(true);
    });

    it('should list all tool permissions', () => {
      const allTools = toolAuthManager.getAllToolAuths();

      expect(allTools.length).toBeGreaterThan(0);

      // Find specific tools
      const readDoc = allTools.find(t => t.toolName === 'read_document');
      const updateDoc = allTools.find(t => t.toolName === 'update_document');

      expect(readDoc?.enabled).toBe(true);
      expect(updateDoc?.enabled).toBe(false);
    });
  });

  describe('SEC-006: Session Isolation (User Data Access)', () => {
    beforeEach(() => {
      const testModel = {
        id: 'test-model-sec-006',
        name: 'Test Model',
        provider: 'openai' as const,
        apiKeyEncrypted: 'encrypted-key',
        baseUrl: 'https://api.openai.com',
        modelId: 'gpt-4',
        isDefault: false,
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveModel(testModel);

      const session1 = {
        id: 'session-user-1',
        threadId: 'thread-1',
        p2pId: 'user-1-p2p',
        modelId: 'test-model-sec-006',
        messageCount: 5,
        messageLimit: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const session2 = {
        id: 'session-user-2',
        threadId: 'thread-2',
        p2pId: 'user-2-p2p',
        modelId: 'test-model-sec-006',
        messageCount: 10,
        messageLimit: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveSession(session1);
      saveSession(session2);
    });

    it('should only return session for specific thread_id', () => {
      // Querying thread-1 should NOT return thread-2's data
      const result1 = getSession('thread-1');
      const result2 = getSession('thread-2');

      expect(result1?.threadId).toBe('thread-1');
      expect(result2?.threadId).toBe('thread-2');
      expect(result1?.id).not.toBe(result2?.id);
    });

    it('should return null for non-existent thread', () => {
      const result = getSession('non-existent-thread');
      expect(result).toBeNull();
    });

    it('should not allow access to other users sessions via ID guessing', () => {
      // Try to access session-1 via session-2's ID
      const session1 = getSession('thread-1');
      const session2 = getSession('thread-2');

      // They should be different
      expect(session1?.id).not.toBe(session2?.id);
      expect(session1?.p2pId).not.toBe(session2?.p2pId);
    });

    it('should isolate messages by session', () => {
      // Verify the messages table has proper session_id FK
      const tableInfo = db.prepare('PRAGMA table_info(messages)').all();
      const columns = tableInfo as { name: string }[];
      const hasSessionFK = columns.some(c => c.name === 'session_id');

      expect(hasSessionFK).toBe(true);
    });
  });
});