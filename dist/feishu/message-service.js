export class MessageService {
    client;
    constructor(client) {
        this.client = client;
    }
    async sendTextMessage(chatId, content) {
        const response = await this.client.im.v1.message.create({
            params: { receive_id_type: 'chat_id' },
            data: {
                receive_id: chatId,
                msg_type: 'text',
                content: JSON.stringify({ text: content }),
            },
        });
        if (!response.data?.message_id) {
            throw new Error('Failed to send text message: no message_id returned');
        }
        return response.data.message_id;
    }
    async sendCardMessage(chatId, card) {
        const cardObj = card;
        const cardContent = cardObj.card || cardObj;
        const response = await this.client.im.v1.message.create({
            params: { receive_id_type: 'chat_id' },
            data: {
                receive_id: chatId,
                msg_type: 'interactive',
                content: JSON.stringify(cardContent),
            },
        });
        if (!response.data?.message_id) {
            throw new Error('Failed to send card message: no message_id returned');
        }
        return response.data.message_id;
    }
    async updateCardMessage(messageId, card) {
        const cardObj = card;
        const cardContent = cardObj.card || cardObj;
        await this.client.im.v1.message.update({
            path: { message_id: messageId },
            data: {
                msg_type: 'interactive',
                content: JSON.stringify(cardContent),
            },
        });
    }
}
//# sourceMappingURL=message-service.js.map