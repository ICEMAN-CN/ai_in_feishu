import { serve } from '@hono/node-server';
import { CallbackRouter } from './routers/callback';
import { FeishuWSManager } from './core/ws-manager';
import { MessageHandler } from './feishu/message-handler';
import { createFeishuClient } from './feishu/client';
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';
import { getEnabledModels, getDb } from './core/config-store';
import { LLMRouter } from './services/llm-router';
import { SessionManager } from './core/session-manager';
import { StreamingHandler } from './services/streaming-handler';
import { logger } from './core/logger';

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';

export interface AppConfig {
  appId?: string;
  appSecret?: string;
  callbackPort?: number;
  wsEnabled?: boolean;
}

export class AIFeishuApp {
  private wsManager?: FeishuWSManager;
  private callbackRouter: CallbackRouter;
  private messageService?: MessageService;
  private messageHandler: MessageHandler;
  private config: Required<AppConfig>;

  // AI processing components
  private llmRouter: LLMRouter;
  private sessionManager: SessionManager;
  private streamingHandler?: StreamingHandler;

  constructor(config: AppConfig = {}) {
    this.config = {
      appId: config.appId || FEISHU_APP_ID,
      appSecret: config.appSecret || FEISHU_APP_SECRET,
      callbackPort: config.callbackPort || 3000,
      wsEnabled: config.wsEnabled !== false,
    };

    this.callbackRouter = new CallbackRouter();
    this.messageHandler = new MessageHandler();

    // Initialize AI processing components
    const db = getDb();
    this.llmRouter = new LLMRouter();
    this.sessionManager = new SessionManager(db);
  }

  async start(): Promise<void> {
    const { appId, appSecret, wsEnabled } = this.config;

    if (!appId || !appSecret) {
      throw new Error('FEISHU_APP_ID and FEISHU_APP_SECRET must be set');
    }

    if (wsEnabled) {
      this.wsManager = new FeishuWSManager({ appId, appSecret });

      this.wsManager.registerHandler('im.message.receive_v1', async (data: any) => {
        const event = data as any;
        const messageId = event.message?.message_id || event.message_id || '';
        const chatId = event.message?.chat_id || event.chat_id || '';
        const senderOpenId = event.message?.sender?.open_id || event.sender?.open_id || '';

        if (this.messageHandler.isDuplicate(messageId)) {
          return;
        }
        logger.info('App', `WS Message received: ${messageId} from ${senderOpenId} in chat ${chatId}`);

        // 延迟初始化 MessageService
        if (!this.messageService) {
          this.messageService = new MessageService(this.wsManager!.getClient());
        }

        // 获取消息内容
        const textContent = this.extractTextFromWSMessage(event);
        if (!textContent) {
          logger.debug('App', 'Empty text content, ignoring');
          return;
        }

        if (!chatId) {
          logger.error('App', 'Missing chat_id in WS message');
          return;
        }

        await this.handleUserMessage(chatId, messageId, textContent);
      });

      this.wsManager.start();
      // 设置全局状态供 health 端点使用
      (globalThis as any).__WS_CONNECTED__ = true;
    }

    // Initialize streaming handler lazily
    this.callbackRouter.onMessage(async (parsed) => {
      logger.info('App', `Callback Message: ${parsed.messageId} from ${parsed.senderOpenId}`);

      if (!this.messageService) {
        const client = createFeishuClient({
          appId: this.config.appId,
          appSecret: this.config.appSecret,
          botName: 'AI_Feishu',
        });
        this.messageService = new MessageService(client);
      }

      const textContent = this.messageHandler.extractTextContent(parsed);
      if (!textContent) {
        logger.debug('App', 'Empty text content, ignoring');
        return;
      }

      await this.handleUserMessage(parsed.chatId, parsed.messageId, textContent);
    });

    this.startCallbackServer();
  }

  private extractTextFromWSMessage(event: any): string {
    const msgType = event.message?.msg_type || event.message?.message_type;
    const content = event.message?.content;

    if (msgType === 'text') {
      try {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        return parsed.text || '';
      } catch {
        return '';
      }
    }
    return '';
  }

  private getStreamingHandler(): StreamingHandler {
    if (!this.streamingHandler) {
      if (!this.messageService) {
        throw new Error('MessageService not initialized');
      }
      this.streamingHandler = new StreamingHandler(
        this.llmRouter,
        this.sessionManager,
        this.messageService
      );
    }
    return this.streamingHandler;
  }

  private async handleUserMessage(chatId: string, messageId: string, textContent: string): Promise<void> {
    logger.info('App', `handleUserMessage: chatId=${chatId}, messageId=${messageId}, text=${textContent.substring(0, 50)}`);

    try {
      const session = await this.sessionManager.createOrGetSession(chatId, messageId, messageId);
      logger.info('App', `Session created/found: ${session ? session.id : 'null'}`);

      if (!session) {
        // 如果没有 session，先发送欢迎文本
        await this.messageService!.sendTextMessage(chatId, '收到消息，请先选择一个AI模型开始对话');
        return;
      }

      // 尝试发送流式卡片响应
      try {
        await this.getStreamingHandler().handleUserMessage(chatId, messageId, textContent);
      } catch (streamError: any) {
        logger.error('App', `Streaming failed: ${streamError.message}`);
        // 流式失败时，尝试发送文本响应作为降级
        if (streamError.message?.includes('invalid msg_type')) {
          await this.messageService!.sendTextMessage(chatId, '抱歉，AI模型响应失败，请稍后重试');
        }
      }
    } catch (e) {
      logger.error('App', `Failed to handle message: ${e}`);
      try {
        await this.messageService!.sendTextMessage(chatId, '处理消息失败，请重试');
      } catch (e2) {
        logger.error('App', `Failed to send error text message: ${e2}`);
      }
    }
  }

  private startCallbackServer(): void {
    const { callbackPort } = this.config;
    const app = this.callbackRouter.getApp();

    logger.info('App', `Callback server starting on port ${callbackPort}...`);

    serve({
      fetch: app.fetch,
      port: callbackPort,
    });

    logger.info('App', `Callback server running at http://localhost:${callbackPort}`);
  }

  stop(): void {
    if (this.wsManager) {
      this.wsManager.stop();
    }
  }
}

export { CallbackRouter };
export { FeishuWSManager };
export { MessageHandler };
export { CardBuilder };
export { MessageService };

// ==================== 启动入口 ====================

async function main() {
  const app = new AIFeishuApp({
    appId: FEISHU_APP_ID,
    appSecret: FEISHU_APP_SECRET,
    wsEnabled: true,
  });

  try {
    await app.start();
    logger.info('App', 'AI_Feishu started successfully');
  } catch (error) {
    logger.error('App', 'Failed to start:', error);
    process.exit(1);
  }
}

main();