import { describe, it, expect, beforeEach } from 'vitest';
import { MessageHandler } from '../src/feishu/message-handler';
import { FeishuMessageEvent } from '../src/types/message';

describe('MessageHandler', () => {
  let handler: MessageHandler;

  beforeEach(() => {
    handler = new MessageHandler();
  });

  describe('parseMessage()', () => {
    it('should parse text message event correctly', () => {
      const event: FeishuMessageEvent = {
        event_id: 'evt_123',
        event_type: 'im.message.receive_v1',
        create_time: '1775978207392',
        token: 'test_token',
        tenant_key: 'tenant_abc',
        app_id: 'app_123',
        message: {
          message_id: 'msg_001',
          root_id: '',
          parent_id: '',
          create_time: '1775978207065',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'text',
          content: '{"text":"Hello World"}',
        },
        event: {
          sender: { id: { open_id: 'user_456' }, sender_type: 'user' },
        },
      };

      const parsed = handler.parseMessage(event);

      expect(parsed.eventId).toBe('evt_123');
      expect(parsed.messageId).toBe('msg_001');
      expect(parsed.rootId).toBe('msg_001');
      expect(parsed.parentId).toBe('');
      expect(parsed.chatId).toBe('chat_123');
      expect(parsed.chatType).toBe('p2p');
      expect(parsed.messageType).toBe('text');
      expect(parsed.content).toEqual({ text: 'Hello World' });
      expect(parsed.senderOpenId).toBe('user_456');
      expect(parsed.senderType).toBe('user');
      expect(parsed.timestamp).toBe('1775978207392');
    });

    it('should use message_id as rootId when root_id is empty', () => {
      const event: FeishuMessageEvent = {
        event_id: 'evt_123',
        message: {
          message_id: 'msg_001',
          root_id: '',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'text',
          content: '{"text":"test"}',
        },
      };

      const parsed = handler.parseMessage(event);
      expect(parsed.rootId).toBe('msg_001');
    });

    it('should use existing root_id when provided', () => {
      const event: FeishuMessageEvent = {
        event_id: 'evt_123',
        message: {
          message_id: 'msg_002',
          root_id: 'msg_001',
          parent_id: 'msg_001',
          chat_id: 'chat_123',
          chat_type: 'group',
          message_type: 'text',
          content: '{"text":"reply"}',
        },
      };

      const parsed = handler.parseMessage(event);
      expect(parsed.rootId).toBe('msg_001');
      expect(parsed.parentId).toBe('msg_001');
    });

    it('should parse invalid JSON content gracefully', () => {
      const event: FeishuMessageEvent = {
        event_id: 'evt_123',
        message: {
          message_id: 'msg_001',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'text',
          content: 'not valid json',
        },
      };

      const parsed = handler.parseMessage(event);
      expect(parsed.content).toEqual({ text: 'not valid json' });
    });

    it('should parse interactive message correctly', () => {
      const event: FeishuMessageEvent = {
        event_id: 'evt_456',
        message: {
          message_id: 'msg_003',
          root_id: 'msg_003',
          chat_id: 'chat_456',
          chat_type: 'group',
          message_type: 'interactive',
          content: '{"card":"interactive_card_content"}',
        },
      };

      const parsed = handler.parseMessage(event);
      expect(parsed.messageType).toBe('interactive');
      expect(parsed.content).toEqual({ card: 'interactive_card_content' });
    });
  });

  describe('isDuplicate()', () => {
    it('should return false for first message', () => {
      expect(handler.isDuplicate('msg_001')).toBe(false);
    });

    it('should return true for duplicate message', () => {
      handler.isDuplicate('msg_001');
      expect(handler.isDuplicate('msg_001')).toBe(true);
    });

    it('should return false for different messages', () => {
      handler.isDuplicate('msg_001');
      expect(handler.isDuplicate('msg_002')).toBe(false);
    });

    it('should track multiple message ids', () => {
      handler.isDuplicate('msg_001');
      handler.isDuplicate('msg_002');
      handler.isDuplicate('msg_003');

      expect(handler.isDuplicate('msg_001')).toBe(true);
      expect(handler.isDuplicate('msg_002')).toBe(true);
      expect(handler.isDuplicate('msg_003')).toBe(true);
      expect(handler.isDuplicate('msg_004')).toBe(false);
    });
  });

  describe('isTextMessage()', () => {
    it('should return true for text message', () => {
      const parsed = handler.parseMessage({
        event_id: 'evt_123',
        message: {
          message_id: 'msg_001',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'text',
          content: '{"text":"hello"}',
        },
      });

      expect(handler.isTextMessage(parsed)).toBe(true);
    });

    it('should return false for interactive message', () => {
      const parsed = handler.parseMessage({
        event_id: 'evt_123',
        message: {
          message_id: 'msg_001',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'interactive',
          content: '{}',
        },
      });

      expect(handler.isTextMessage(parsed)).toBe(false);
    });
  });

  describe('isInteractiveMessage()', () => {
    it('should return true for interactive message', () => {
      const parsed = handler.parseMessage({
        event_id: 'evt_123',
        message: {
          message_id: 'msg_001',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'interactive',
          content: '{}',
        },
      });

      expect(handler.isInteractiveMessage(parsed)).toBe(true);
    });

    it('should return false for text message', () => {
      const parsed = handler.parseMessage({
        event_id: 'evt_123',
        message: {
          message_id: 'msg_001',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'text',
          content: '{"text":"hello"}',
        },
      });

      expect(handler.isInteractiveMessage(parsed)).toBe(false);
    });
  });

  describe('extractTextContent()', () => {
    it('should extract text from text message', () => {
      const parsed = handler.parseMessage({
        event_id: 'evt_123',
        message: {
          message_id: 'msg_001',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'text',
          content: '{"text":"Hello World"}',
        },
      });

      expect(handler.extractTextContent(parsed)).toBe('Hello World');
    });

    it('should return empty string for non-text message', () => {
      const parsed = handler.parseMessage({
        event_id: 'evt_123',
        message: {
          message_id: 'msg_001',
          chat_id: 'chat_123',
          chat_type: 'p2p',
          message_type: 'interactive',
          content: '{"card":"data"}',
        },
      });

      expect(handler.extractTextContent(parsed)).toBe('');
    });
  });
});
