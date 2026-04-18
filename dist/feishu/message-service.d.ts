import { Client } from '@larksuiteoapi/node-sdk';
export declare class MessageService {
    private client;
    constructor(client: Client);
    sendTextMessage(chatId: string, content: string): Promise<string>;
    sendCardMessage(chatId: string, card: object): Promise<string>;
    updateCardMessage(messageId: string, card: object): Promise<void>;
}
//# sourceMappingURL=message-service.d.ts.map