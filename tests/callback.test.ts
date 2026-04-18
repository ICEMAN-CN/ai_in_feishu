import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { CallbackRouter } from '../src/routers/callback';

const TEST_TOKEN = 'test-verification-token';

function createSignature(body: string, timestamp: string): string {
  const str = timestamp + body;
  return createHmac('sha256', TEST_TOKEN).update(str).digest('hex');
}

const TEST_EVENT_USER = {
  schema: '2.0',
  event_id: 'evt_123',
  event_type: 'im.message.receive_v1',
  create_time: '1775991728000',
  token: 'test_token',
  event: {
    sender: { id: { open_id: 'user_456' }, sender_type: 'user' },
    message: {
      message_id: 'msg_001',
      root_id: 'msg_001',
      parent_id: '',
      chat_id: 'chat_123',
      chat_type: 'p2p',
      message_type: 'text',
      content: '{"text":"Hello"}',
    },
  },
};

const TEST_EVENT_BOT = {
  schema: '2.0',
  event_id: 'evt_456',
  event_type: 'im.message.receive_v1',
  create_time: '1775991728000',
  token: 'test_token',
  event: {
    sender: { id: { open_id: 'bot_789' }, sender_type: 'bot' },
    message: {
      message_id: 'msg_002',
      root_id: 'msg_002',
      chat_id: 'chat_123',
      chat_type: 'p2p',
      message_type: 'text',
      content: '{"text":"Bot message"}',
    },
  },
};

describe('CallbackRouter', () => {
  let router: CallbackRouter;
  let handlerCalled: string[] = [];
  const originalToken = process.env.FEISHU_VERIFICATION_TOKEN;

  beforeEach(() => {
    process.env.FEISHU_VERIFICATION_TOKEN = TEST_TOKEN;
    router = new CallbackRouter();
    handlerCalled = [];
    router.onMessage((parsed) => {
      handlerCalled.push(parsed.messageId);
    });
  });

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env.FEISHU_VERIFICATION_TOKEN = originalToken;
    } else {
      delete process.env.FEISHU_VERIFICATION_TOKEN;
    }
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await router.getApp().request('/health');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: 'ok' });
    });
  });

  describe('POST /feishu', () => {
    it('should return 400 for invalid JSON', async () => {
      const body = 'not valid json';
      const timestamp = '1234567890';
      const res = await router.getApp().request('/feishu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lark-Request-Timestamp': timestamp,
          'X-Lark-Request-Signature': createSignature(body, timestamp),
        },
        body,
      });
      expect(res.status).toBe(400);
    });

    it('should skip non-message events', async () => {
      const event = { event_type: 'im.other_event' };
      const body = JSON.stringify(event);
      const timestamp = '1234567890';
      const res = await router.getApp().request('/feishu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lark-Request-Timestamp': timestamp,
          'X-Lark-Request-Signature': createSignature(body, timestamp),
        },
        body,
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.code).toBe(0);
      expect(handlerCalled.length).toBe(0);
    });

    it('should skip bot messages', async () => {
      const body = JSON.stringify(TEST_EVENT_BOT);
      const timestamp = '1234567890';
      const res = await router.getApp().request('/feishu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lark-Request-Timestamp': timestamp,
          'X-Lark-Request-Signature': createSignature(body, timestamp),
        },
        body,
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.code).toBe(0);
      expect(handlerCalled.length).toBe(0);
    });

    it('should emit event for user messages', async () => {
      const body = JSON.stringify(TEST_EVENT_USER);
      const timestamp = '1234567890';
      const res = await router.getApp().request('/feishu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lark-Request-Timestamp': timestamp,
          'X-Lark-Request-Signature': createSignature(body, timestamp),
        },
        body,
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.code).toBe(0);
      expect(handlerCalled).toContain('msg_001');
    });

    it('should skip duplicate messages', async () => {
      const body = JSON.stringify(TEST_EVENT_USER);
      const timestamp = '1234567890';

      const res1 = await router.getApp().request('/feishu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lark-Request-Timestamp': timestamp,
          'X-Lark-Request-Signature': createSignature(body, timestamp),
        },
        body,
      });
      expect(res1.status).toBe(200);
      expect(handlerCalled.length).toBe(1);

      const res2 = await router.getApp().request('/feishu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lark-Request-Timestamp': timestamp,
          'X-Lark-Request-Signature': createSignature(body, timestamp),
        },
        body,
      });
      expect(res2.status).toBe(200);
      expect(handlerCalled.length).toBe(1);
    });
  });
});