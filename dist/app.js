import { serve } from '@hono/node-server';
import { CallbackRouter } from './routers/callback';
import { FeishuWSManager } from './core/ws-manager';
import { MessageHandler } from './feishu/message-handler';
import { createFeishuClient } from './feishu/client';
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';
import { getEnabledModels } from './core/config-store';
import { logger } from './core/logger';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
export class AIFeishuApp {
    wsManager;
    callbackRouter;
    messageService;
    messageHandler;
    config;
    constructor(config = {}) {
        this.config = {
            appId: config.appId || FEISHU_APP_ID,
            appSecret: config.appSecret || FEISHU_APP_SECRET,
            callbackPort: config.callbackPort || 3000,
            wsEnabled: config.wsEnabled !== false,
        };
        this.callbackRouter = new CallbackRouter();
        this.messageHandler = new MessageHandler();
    }
    async start() {
        const { appId, appSecret, wsEnabled } = this.config;
        if (!appId || !appSecret) {
            throw new Error('FEISHU_APP_ID and FEISHU_APP_SECRET must be set');
        }
        if (wsEnabled) {
            this.wsManager = new FeishuWSManager({ appId, appSecret });
            this.messageService = new MessageService(this.wsManager.getClient());
            this.wsManager.registerHandler('im.message.receive_v1', async (data) => {
                const event = data;
                if (this.messageHandler.isDuplicate(event.message?.message_id || '')) {
                    return;
                }
                logger.debug('App', 'WS Message received:', event.message?.message_id);
            });
            this.wsManager.start();
        }
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
            const enabledModels = getEnabledModels();
            const modelOptions = enabledModels.map((m) => ({
                label: m.name,
                value: m.id,
            }));
            if (modelOptions.length === 0) {
                const errorCard = CardBuilder.new()
                    .header('⚠️ 无可用模型', 'orange')
                    .div('当前没有启用的AI模型，请先在管理界面添加模型')
                    .build();
                await this.messageService.sendCardMessage(parsed.chatId, errorCard);
                return;
            }
            const responseCard = CardBuilder.sessionStarterCard(modelOptions);
            await this.messageService.sendCardMessage(parsed.chatId, responseCard);
        });
        this.startCallbackServer();
    }
    startCallbackServer() {
        const { callbackPort } = this.config;
        logger.info('App', `Callback server starting on port ${callbackPort}...`);
        serve({
            fetch: this.callbackRouter.getApp().fetch,
            port: callbackPort,
        });
        logger.info('App', `Callback server running at http://localhost:${callbackPort}`);
    }
    stop() {
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
//# sourceMappingURL=app.js.map