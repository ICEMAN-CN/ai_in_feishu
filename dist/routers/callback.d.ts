import { Hono } from 'hono';
import { ParsedMessage } from '../types/message';
export type MessageHandler = (parsed: ParsedMessage) => void | Promise<void>;
export type CardActionHandler = (action: CardAction) => void | Promise<void>;
export interface CardAction {
    actionId: string;
    actionValue: Record<string, any>;
    messageId: string;
    chatId: string;
    openId: string;
}
export declare class CallbackRouter {
    private app;
    private messageHandlers;
    private cardActionHandlers;
    private messageHandler;
    private processedMessageIds;
    private readonly MAX_SIZE;
    private readonly TTL_MS;
    constructor();
    private setupRoutes;
    private isCardActionEvent;
    private handleCardAction;
    private isMessageEvent;
    private isDuplicate;
    private emit;
    onMessage(handler: MessageHandler): void;
    offMessage(handler: MessageHandler): void;
    onCardAction(handler: CardActionHandler): void;
    offCardAction(handler: CardActionHandler): void;
    getApp(): Hono;
}
//# sourceMappingURL=callback.d.ts.map