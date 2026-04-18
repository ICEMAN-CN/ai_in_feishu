import { LLMRouter } from './llm-router';
import { SessionManager } from '../core/session-manager';
import { MessageService } from '../feishu/message-service';
export interface StreamingHandlerConfig {
    updateIntervalMs: number;
}
export declare class StreamingHandler {
    private llmRouter;
    private sessionManager;
    private messageService;
    private config;
    private currentModelName;
    constructor(llmRouter: LLMRouter, sessionManager: SessionManager, messageService: MessageService, config?: Partial<StreamingHandlerConfig>);
    handleUserMessage(chatId: string, threadId: string, userMessage: string): Promise<void>;
    private updateCardWithCursor;
    private finalizeCard;
    private sendErrorCard;
}
export {};
//# sourceMappingURL=streaming-handler.d.ts.map