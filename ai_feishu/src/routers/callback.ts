import { Hono } from 'hono';
import { verifyFeishuSignature } from '../feishu/validator';
import { MessageHandler as FeishuMessageHandler } from '../feishu/message-handler';
import { FeishuMessageEvent, ParsedMessage } from '../types/message';

export type MessageHandler = (parsed: ParsedMessage) => void | Promise<void>;
export type CardActionHandler = (action: CardAction) => void | Promise<void>;

export interface CardAction {
  actionId: string;
  actionValue: Record<string, any>;
  messageId: string;
  chatId: string;
  openId: string;
}

export class CallbackRouter {
  private app: Hono;
  private messageHandlers: Set<MessageHandler> = new Set();
  private cardActionHandlers: Set<CardActionHandler> = new Set();
  private messageHandler: FeishuMessageHandler;

  constructor() {
    this.app = new Hono();
    this.messageHandler = new FeishuMessageHandler();
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

      let event: any;
      try {
        event = JSON.parse(body);
      } catch {
        console.error('[Callback] Failed to parse event body');
        return c.json({ code: 400, msg: 'Bad Request' }, 400);
      }

      if (this.isCardActionEvent(event)) {
        this.handleCardAction(event);
        return c.json({ code: 0, msg: 'success' });
      }

      if (!this.isMessageEvent(event)) {
        return c.json({ code: 0, msg: 'success' });
      }

      const parsed = this.messageHandler.parseMessage(event);

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

  private isCardActionEvent(event: any): boolean {
    return event.event_type === 'im.card.action.trigger';
  }

  private handleCardAction(event: any): void {
    const action: CardAction = {
      actionId: event.action?.action_id || event.action_id || '',
      actionValue: event.action?.value || event.action_value || {},
      messageId: event.message?.message_id || event.message_id || '',
      chatId: event.message?.chat_id || event.chat_id || '',
      openId: event.sender?.sender_id?.open_id || event.open_id || '',
    };
    console.log(`[Callback] Card action: ${action.actionId}`);
    this.cardActionHandlers.forEach((handler) => {
      try {
        handler(action);
      } catch (e) {
        console.error('[Callback] Card action handler error:', e);
      }
    });
  }

  private isMessageEvent(event: FeishuMessageEvent): boolean {
    const eventType = event.event_type || event.header?.event_type;
    return eventType === 'im.message.receive_v1';
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

  onCardAction(handler: CardActionHandler): void {
    this.cardActionHandlers.add(handler);
  }

  offCardAction(handler: CardActionHandler): void {
    this.cardActionHandlers.delete(handler);
  }

  getApp(): Hono {
    return this.app;
  }
}