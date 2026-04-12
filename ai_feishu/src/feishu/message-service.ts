import { Client } from '@larksuiteoapi/node-sdk';

export class MessageService {
  constructor(private client: Client) {}

  async sendTextMessage(chatId: string, content: string): Promise<string> {
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

  async sendCardMessage(chatId: string, card: object): Promise<string> {
    const cardObj = card as { schema?: string; card?: object };
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

  async updateCardMessage(messageId: string, card: object): Promise<void> {
    const cardObj = card as { schema?: string; card?: object };
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