import { serve } from '@hono/node-server';
import { CallbackRouter } from './routers/callback';
import { FeishuWSManager } from './core/ws-manager';
import { MessageHandler } from './feishu/message-handler';
import { createFeishuClient } from './feishu/client';
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';

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

  constructor(config: AppConfig = {}) {
    this.config = {
      appId: config.appId || FEISHU_APP_ID,
      appSecret: config.appSecret || FEISHU_APP_SECRET,
      callbackPort: config.callbackPort || 3000,
      wsEnabled: config.wsEnabled !== false,
    };

    this.callbackRouter = new CallbackRouter();
    this.messageHandler = new MessageHandler();
  }

  async start(): Promise<void> {
    const { appId, appSecret, wsEnabled } = this.config;

    if (!appId || !appSecret) {
      throw new Error('FEISHU_APP_ID and FEISHU_APP_SECRET must be set');
    }

    if (wsEnabled) {
      this.wsManager = new FeishuWSManager({ appId, appSecret });
      this.messageService = new MessageService(this.wsManager.getClient());

      this.wsManager.registerHandler('im.message.receive_v1', async (data: any) => {
        const event = data as any;
        if (this.messageHandler.isDuplicate(event.message?.message_id || '')) {
          return;
        }
        console.log('[WS] Message received:', event.message?.message_id);
      });

      this.wsManager.start();
    }

    this.callbackRouter.onMessage(async (parsed) => {
      console.log(`[Callback] Message: ${parsed.messageId} from ${parsed.senderOpenId}`);

      if (!this.messageService) {
        const client = createFeishuClient({
          appId: this.config.appId,
          appSecret: this.config.appSecret,
          botName: 'AI_Feishu',
        });
        this.messageService = new MessageService(client);
      }

      const responseCard = CardBuilder.sessionStarterCard([
        { label: 'GPT-4', value: 'gpt4' },
        { label: 'Claude', value: 'claude' },
      ]);
      await this.messageService.sendCardMessage(parsed.chatId, responseCard);
    });

    this.startCallbackServer();
  }

  private startCallbackServer(): void {
    const { callbackPort } = this.config;
    console.log(`[App] Callback server starting on port ${callbackPort}...`);

    serve({
      fetch: this.callbackRouter.getApp().fetch,
      port: callbackPort,
    });

    console.log(`[App] Callback server running at http://localhost:${callbackPort}`);
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