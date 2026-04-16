/**
 * Sprint 8 Integration Tests - Message-Flow
 *
 * Tests the full message → session → conversation flow:
 * - MessageHandler.parseMessage() with valid mock event
 * - MessageHandler.isDuplicate() - detect duplicate messages
 * - SessionManager.createOrGetSession() - creates new session
 * - SessionManager.createOrGetSession() - returns existing session
 * - Full message → session → conversation flow
 *
 * Run: npm test -- tests/integration-8-message-flow.test.ts --run
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { MessageHandler } from '../src/feishu/message-handler';
import { SessionManager } from '../src/core/session-manager';
import {
  createMockFeishuMessageEvent,
  createMockCardActionEvent,
} from './mocks/feishu-message.mock';

describe('Sprint 8 Message-Flow Integration Tests', () => {
  let db: Database.Database;
  let sessionManager: SessionManager;
  let messageHandler: MessageHandler;

  beforeEach(() => {
    // Setup in-memory database for SessionManager
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
    messageHandler = new MessageHandler();
  });

  // ========================================
  // TC-8.1: MessageHandler.parseMessage() with valid mock event
  // ========================================
  describe('MessageHandler.parseMessage()', () => {
    it('TC-8.1-001: should parse valid mock feishu message event correctly', () => {
      const mockEvent = createMockFeishuMessageEvent({
        chatId: 'chat_test_123',
        chatType: 'p2p',
        content: '{"text":"Hello AI"}',
        messageType: 'text',
        senderOpenId: 'ou_sender_123',
        senderType: 'user',
      });

      const parsed = messageHandler.parseMessage(mockEvent);

      expect(parsed.eventId).toBeDefined();
      expect(parsed.messageId).toBeDefined();
      expect(parsed.chatId).toBe('chat_test_123');
      expect(parsed.chatType).toBe('p2p');
      expect(parsed.messageType).toBe('text');
      expect(parsed.content).toEqual({ text: 'Hello AI' });
      expect(parsed.senderOpenId).toBe('ou_sender_123');
      expect(parsed.senderType).toBe('user');
    });

    it('TC-8.1-002: should parse mock interactive card action event', () => {
      const mockEvent = createMockCardActionEvent({
        actionId: 'btn_submit',
        value: { key: 'value' },
        chatId: 'chat_card_456',
        openId: 'ou_card_user',
      });

      const parsed = messageHandler.parseMessage(mockEvent);

      expect(parsed.messageType).toBe('interactive');
      expect(parsed.chatId).toBe('chat_card_456');
      expect(parsed.senderOpenId).toBe('ou_card_user');
    });

    it('TC-8.1-003: should use message_id as rootId when root_id is empty', () => {
      const mockEvent = createMockFeishuMessageEvent({
        rootId: '',
        parentId: '',
      });

      const parsed = messageHandler.parseMessage(mockEvent);

      expect(parsed.rootId).toBe(parsed.messageId);
    });

    it('TC-8.1-004: should preserve root_id and parent_id when provided', () => {
      const mockEvent = createMockFeishuMessageEvent({
        rootId: 'root_msg_001',
        parentId: 'parent_msg_002',
      });

      const parsed = messageHandler.parseMessage(mockEvent);

      expect(parsed.rootId).toBe('root_msg_001');
      expect(parsed.parentId).toBe('parent_msg_002');
    });
  });

  // ========================================
  // TC-8.2: MessageHandler.isDuplicate() - detect duplicate messages
  // ========================================
  describe('MessageHandler.isDuplicate()', () => {
    it('TC-8.2-001: should return false for first message', () => {
      const mockEvent = createMockFeishuMessageEvent({
        messageId: 'msg_unique_001',
      });

      const parsed = messageHandler.parseMessage(mockEvent);
      expect(messageHandler.isDuplicate(parsed.messageId)).toBe(false);
    });

    it('TC-8.2-002: should return true for duplicate message', () => {
      const mockEvent = createMockFeishuMessageEvent({
        messageId: 'msg_dup_001',
      });

      const parsed = messageHandler.parseMessage(mockEvent);

      // First call should add to processed set
      messageHandler.isDuplicate(parsed.messageId);

      // Second call should detect duplicate
      expect(messageHandler.isDuplicate(parsed.messageId)).toBe(true);
    });

    it('TC-8.2-003: should return false for different messages', () => {
      const mockEvent1 = createMockFeishuMessageEvent({
        messageId: 'msg_diff_001',
      });
      const mockEvent2 = createMockFeishuMessageEvent({
        messageId: 'msg_diff_002',
      });

      const parsed1 = messageHandler.parseMessage(mockEvent1);
      const parsed2 = messageHandler.parseMessage(mockEvent2);

      messageHandler.isDuplicate(parsed1.messageId);

      expect(messageHandler.isDuplicate(parsed2.messageId)).toBe(false);
    });

    it('TC-8.2-004: should track multiple unique message ids', () => {
      const events = [
        createMockFeishuMessageEvent({ messageId: 'msg_multi_001' }),
        createMockFeishuMessageEvent({ messageId: 'msg_multi_002' }),
        createMockFeishuMessageEvent({ messageId: 'msg_multi_003' }),
      ];

      const parsedMessages = events.map((e) => messageHandler.parseMessage(e));

      // All first-time messages should return false
      expect(messageHandler.isDuplicate(parsedMessages[0].messageId)).toBe(false);
      expect(messageHandler.isDuplicate(parsedMessages[1].messageId)).toBe(false);
      expect(messageHandler.isDuplicate(parsedMessages[2].messageId)).toBe(false);

      // All second-time messages should return true (duplicates)
      expect(messageHandler.isDuplicate(parsedMessages[0].messageId)).toBe(true);
      expect(messageHandler.isDuplicate(parsedMessages[1].messageId)).toBe(true);
      expect(messageHandler.isDuplicate(parsedMessages[2].messageId)).toBe(true);
    });
  });

  // ========================================
  // TC-8.3: SessionManager.createOrGetSession() - creates new session
  // ========================================
  describe('SessionManager.createOrGetSession() - new session', () => {
    it('TC-8.3-001: should create new session for new p2p chat', async () => {
      const session = await sessionManager.createOrGetSession('p2p_new_123');

      expect(session).not.toBeNull();
      expect(session!.p2pId).toBe('p2p_new_123');
      expect(session!.threadId).toBeDefined();
      expect(session!.modelId).toBe('default-model');
      expect(session!.messageCount).toBe(0);
    });

    it('TC-8.3-002: should create session with provided rootId as threadId', async () => {
      const session = await sessionManager.createOrGetSession('p2p_root_456', 'thread_existing_789');

      expect(session).not.toBeNull();
      expect(session!.threadId).toBe('thread_existing_789');
      expect(session!.p2pId).toBe('p2p_root_456');
    });

    it('TC-8.3-003: should return null when no default model available', async () => {
      // Clear the default model
      db.exec("DELETE FROM models WHERE id = 'default-model'");

      const session = await sessionManager.createOrGetSession('p2p_no_model');

      expect(session).toBeNull();
    });
  });

  // ========================================
  // TC-8.4: SessionManager.createOrGetSession() - returns existing session
  // ========================================
  describe('SessionManager.createOrGetSession() - existing session', () => {
    it('TC-8.4-001: should return existing session when threadId matches', async () => {
      const threadId = 'thread_shared_001';

      const session1 = await sessionManager.createOrGetSession('p2p_shared', threadId);
      const session2 = await sessionManager.createOrGetSession('p2p_shared', threadId);

      expect(session1).not.toBeNull();
      expect(session2).not.toBeNull();
      expect(session1!.id).toBe(session2!.id);
      expect(session1!.threadId).toBe(session2!.threadId);
    });

    it('TC-8.4-002: should throw error when parentId exists but thread does not', async () => {
      await expect(
        sessionManager.createOrGetSession('p2porphan', 'nonexistent_root', 'parent_exists')
      ).rejects.toThrow('Thread不存在');
    });

    it('TC-8.4-003: should allow parent reply in existing thread', async () => {
      const rootId = 'thread_reply_001';

      // Create initial session
      const session1 = await sessionManager.createOrGetSession('p2p_reply', rootId);
      expect(session1).not.toBeNull();

      // Reply in same thread (parentId = rootId means this is a reply)
      const session2 = await sessionManager.createOrGetSession('p2p_reply', rootId, rootId);
      expect(session2).not.toBeNull();
      expect(session2!.id).toBe(session1!.id);
    });
  });

  // ========================================
  // TC-8.5: Full message → session → conversation flow
  // ========================================
  describe('Full message → session → conversation flow', () => {
    it('TC-8.5-001: should process message and create session in flow', async () => {
      // Step 1: Create mock message event
      const mockEvent = createMockFeishuMessageEvent({
        chatId: 'chat_flow_001',
        chatType: 'p2p',
        content: '{"text":"Hello, what is AI?"}',
        messageType: 'text',
        senderOpenId: 'ou_flow_user',
        senderType: 'user',
      });

      // Step 2: Parse the message
      const parsed = messageHandler.parseMessage(mockEvent);
      expect(parsed.chatId).toBe('chat_flow_001');
      expect(parsed.messageType).toBe('text');

      // Step 3: Check for duplicates
      const isDup = messageHandler.isDuplicate(parsed.messageId);
      expect(isDup).toBe(false);

      // Step 4: Create or get session
      const session = await sessionManager.createOrGetSession(
        parsed.chatId,
        parsed.rootId || undefined,
        parsed.parentId || undefined
      );
      expect(session).not.toBeNull();
      expect(session!.p2pId).toBe('chat_flow_001');
      expect(session!.modelId).toBe('default-model');
    });

    it('TC-8.5-002: should handle multi-turn conversation in same thread', async () => {
      const p2pId = 'chat_conversation_001';

      // Turn 1: Initial message (no rootId, creates new thread)
      const event1 = createMockFeishuMessageEvent({
        chatId: p2pId,
        content: '{"text":"First message"}',
        messageId: 'msg_conv_001',
        rootId: '',
        parentId: '',
      });
      const parsed1 = messageHandler.parseMessage(event1);
      const session1 = await sessionManager.createOrGetSession(
        parsed1.chatId,
        parsed1.rootId || undefined
      );
      expect(session1).not.toBeNull();

      // Turn 2: Reply in same thread (use same rootId = session's threadId)
      const event2 = createMockFeishuMessageEvent({
        chatId: p2pId,
        content: '{"text":"Second message"}',
        messageId: 'msg_conv_002',
        rootId: session1!.threadId, // Use actual threadId
        parentId: 'msg_conv_001',
      });
      const parsed2 = messageHandler.parseMessage(event2);
      const session2 = await sessionManager.createOrGetSession(
        parsed2.chatId,
        parsed2.rootId || undefined,
        parsed2.parentId || undefined
      );

      // Both turns should be in same session
      expect(session2).not.toBeNull();
      expect(session1!.id).toBe(session2!.id);
    });

    it('TC-8.5-003: should detect duplicate in message flow', async () => {
      const mockEvent = createMockFeishuMessageEvent({
        chatId: 'chat_dup_flow',
        content: '{"text":"Duplicate message"}',
        messageId: 'msg_dup_flow_001',
      });

      // First time
      const parsed = messageHandler.parseMessage(mockEvent);
      const isDup1 = messageHandler.isDuplicate(parsed.messageId);
      expect(isDup1).toBe(false);

      // Simulate resend (duplicate)
      const isDup2 = messageHandler.isDuplicate(parsed.messageId);
      expect(isDup2).toBe(true);

      // Session should not be created for duplicate
      // (In real flow, duplicate check happens before session creation)
    });

    it('TC-8.5-004: should handle card action and create session', async () => {
      // Card action event
      const cardEvent = createMockCardActionEvent({
        actionId: 'kb_search',
        value: { query: 'AI knowledge' },
        chatId: 'chat_card_flow',
        openId: 'ou_card_flow_user',
      });

      // Parse card action
      const parsed = messageHandler.parseMessage(cardEvent);
      expect(parsed.messageType).toBe('interactive');

      // Check duplicate
      const isDup = messageHandler.isDuplicate(parsed.messageId);
      expect(isDup).toBe(false);

      // Create session for card action
      const session = await sessionManager.createOrGetSession(
        parsed.chatId,
        parsed.rootId || undefined,
        parsed.parentId || undefined
      );
      expect(session).not.toBeNull();
      expect(session!.p2pId).toBe('chat_card_flow');
    });

    it('TC-8.5-005: should maintain separate sessions for different p2p chats', async () => {
      const chat1 = 'chat_separate_001';
      const chat2 = 'chat_separate_002';

      // Session for chat1
      const session1 = await sessionManager.createOrGetSession(chat1);
      // Session for chat2
      const session2 = await sessionManager.createOrGetSession(chat2);

      expect(session1).not.toBeNull();
      expect(session2).not.toBeNull();
      expect(session1!.id).not.toBe(session2!.id);
      expect(session1!.p2pId).toBe(chat1);
      expect(session2!.p2pId).toBe(chat2);
    });
  });
});