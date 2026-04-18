import { FeishuMessageEvent, ParsedMessage } from '../types/message';
export declare class MessageHandler {
    private processedMessageIds;
    parseMessage(event: FeishuMessageEvent): ParsedMessage;
    isDuplicate(messageId: string): boolean;
    isTextMessage(parsed: ParsedMessage): boolean;
    isInteractiveMessage(parsed: ParsedMessage): boolean;
    extractTextContent(parsed: ParsedMessage): string;
}
//# sourceMappingURL=message-handler.d.ts.map