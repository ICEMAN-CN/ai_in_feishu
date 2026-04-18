import { CallbackRouter } from './routers/callback';
import { FeishuWSManager } from './core/ws-manager';
import { MessageHandler } from './feishu/message-handler';
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';
export interface AppConfig {
    appId?: string;
    appSecret?: string;
    callbackPort?: number;
    wsEnabled?: boolean;
}
export declare class AIFeishuApp {
    private wsManager?;
    private callbackRouter;
    private messageService?;
    private messageHandler;
    private config;
    constructor(config?: AppConfig);
    start(): Promise<void>;
    private startCallbackServer;
    stop(): void;
}
export { CallbackRouter };
export { FeishuWSManager };
export { MessageHandler };
export { CardBuilder };
export { MessageService };
//# sourceMappingURL=app.d.ts.map