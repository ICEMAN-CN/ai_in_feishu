import { Hono } from 'hono';
import { logger } from '../core/logger';
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
  private processedMessageIds = new Map<string, number>();
  private readonly MAX_SIZE = 10000;
  private readonly TTL_MS = 5 * 60 * 1000;

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
        logger.warn('Callback', 'Invalid signature');
        return c.json({ code: 401, msg: 'Unauthorized' }, 401);
      }

      let event: any;
      try {
        event = JSON.parse(body);
      } catch {
        logger.error('Callback', 'Failed to parse event body');
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
        logger.debug('Callback', `Duplicate message: ${parsed.messageId}`);
        return c.json({ code: 0, msg: 'success' });
      }

      this.emit(parsed);

      return c.json({ code: 0, msg: 'success' });
    });

    this.app.get('/health', (c) => {
      // WebSocket 状态由外部设置
      const wsConnected = (globalThis as any).__WS_CONNECTED__ ?? false;
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        wsConnected,
        mcpConnected: false,
        vectorDbStatus: 'ready',
        currentModel: 'MiniMax-M2.7',
      });
    });
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
    logger.info('Callback', `Card action: ${action.actionId}`);
    this.cardActionHandlers.forEach((handler) => {
      try {
        handler(action);
      } catch (e) {
        logger.error('Callback', 'Card action handler error:', e);
      }
    });
  }

  private isMessageEvent(event: FeishuMessageEvent): boolean {
    const eventType = event.event_type || event.header?.event_type;
    return eventType === 'im.message.receive_v1';
  }

  private isDuplicate(messageId: string): boolean {
    const now = Date.now();
    const timestamp = this.processedMessageIds.get(messageId);

    if (timestamp !== undefined && now - timestamp < this.TTL_MS) {
      return true;
    }

    this.processedMessageIds.set(messageId, now);

    if (this.processedMessageIds.size > this.MAX_SIZE) {
      const cutoff = now - this.TTL_MS;
      for (const [id, ts] of this.processedMessageIds) {
        if (ts < cutoff) {
          this.processedMessageIds.delete(id);
        }
      }
    }

    return false;
  }

  private emit(parsed: ParsedMessage): void {
    logger.debug('Callback', `Emitting message event: ${parsed.messageId}`);
    this.messageHandlers.forEach((handler) => {
      try {
        handler(parsed);
      } catch (e) {
        logger.error('Callback', 'Handler error:', e);
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