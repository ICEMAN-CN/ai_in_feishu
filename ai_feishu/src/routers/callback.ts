import { Hono } from 'hono';
import { verifyFeishuSignature } from '../feishu/validator';
import { FeishuMessageEvent, ParsedMessage } from '../types/message';

export type MessageHandler = (parsed: ParsedMessage) => void | Promise<void>;

export class CallbackRouter {
  private app: Hono;
  private messageHandlers: Set<MessageHandler> = new Set();

  constructor() {
    this.app = new Hono();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.post('/feishu', async (c) => {
      const body = await c.req.text();
      const timestamp = c.req.header('X-Lark-Request-Timestamp') || '';
      const signature = c.req.header('X-Lark-Request-Signature') || '';

      if (!verifyFeishuSignature(body, timestamp, signature)) {
        console.warn('[Callback] Invalid signature');
        return c.json({ code: 401, msg: 'Unauthorized' }, 401);
      }

      let event: FeishuMessageEvent;
      try {
        event = JSON.parse(body);
      } catch {
        console.error('[Callback] Failed to parse event body');
        return c.json({ code: 400, msg: 'Bad Request' }, 400);
      }

      if (!this.isMessageEvent(event)) {
        return c.json({ code: 0, msg: 'success' });
      }

      const parsed = this.parseMessage(event);

      if (parsed.senderType === 'bot') {
        return c.json({ code: 0, msg: 'success' });
      }

      if (this.isDuplicate(parsed.messageId)) {
        console.log(`[Callback] Duplicate message: ${parsed.messageId}`);
        return c.json({ code: 0, msg: 'success' });
      }

      this.emit(parsed);

      return c.json({ code: 0, msg: 'success' });
    });

    this.app.get('/health', (c) => c.json({ status: 'ok' }));
  }

  private isMessageEvent(event: FeishuMessageEvent): boolean {
    const eventType = event.event_type || event.header?.event_type;
    return eventType === 'im.message.receive_v1';
  }

  private parseMessage(event: FeishuMessageEvent): ParsedMessage {
    const eventId = event.event_id || event.header?.event_id || '';
    const timestamp = event.create_time || event.header?.create_time || '';
    const message = event.message || event.event?.message;
    const sender = event.event?.sender;

    let content: unknown;
    try {
      content = JSON.parse(message?.content || '{}');
    } catch {
      content = { text: message?.content || '' };
    }

    return {
      eventId,
      messageId: message?.message_id || '',
      rootId: message?.root_id || message?.message_id || '',
      parentId: message?.parent_id || '',
      chatId: message?.chat_id || '',
      chatType: message?.chat_type || 'p2p',
      messageType: message?.message_type || 'text',
      content,
      senderOpenId: sender?.id?.open_id || '',
      senderType: sender?.sender_type || 'user',
      timestamp,
    };
  }

  private processedMessageIds = new Set<string>();

  private isDuplicate(messageId: string): boolean {
    if (this.processedMessageIds.has(messageId)) {
      return true;
    }
    this.processedMessageIds.add(messageId);

    if (this.processedMessageIds.size > 10000) {
      const iterator = this.processedMessageIds.values();
      for (let i = 0; i < 5000; i++) {
        const next = iterator.next();
        if (next.value) {
          this.processedMessageIds.delete(next.value);
        }
      }
    }

    return false;
  }

  private emit(parsed: ParsedMessage): void {
    console.log(`[Callback] Emitting message event: ${parsed.messageId}`);
    this.messageHandlers.forEach((handler) => {
      try {
        handler(parsed);
      } catch (e) {
        console.error('[Callback] Handler error:', e);
      }
    });
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: MessageHandler): void {
    this.messageHandlers.delete(handler);
  }

  getApp(): Hono {
    return this.app;
  }
}