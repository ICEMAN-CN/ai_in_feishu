import { Client } from '@larksuiteoapi/node-sdk';
import { logger } from '../core/logger';

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

    const cardJson = JSON.stringify(cardContent, null, 2);
    logger.info('MessageService', `Sending interactive card to ${chatId}`);
    logger.debug('MessageService', `Card content: ${cardJson}`);

    try {
      const response = await this.client.im.v1.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: chatId,
          msg_type: 'interactive',
          content: cardJson,
        },
      });
      if (!response.data?.message_id) {
        throw new Error('Failed to send card message: no message_id returned');
      }
      logger.info('MessageService', `Card sent successfully, messageId: ${response.data.message_id}`);
      return response.data.message_id;
    } catch (error: any) {
      logger.error('MessageService', `Failed to send card: ${error.message}`);
      if (error.response) {
        logger.error('MessageService', `Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async updateCardMessage(messageId: string, card: object): Promise<void> {
    const cardObj = card as { schema?: string; card?: object };
    const cardContent = cardObj.card || cardObj;
    const cardJson = JSON.stringify(cardContent, null, 2);

    logger.info('MessageService', `Updating card message ${messageId}`);

    try {
      await this.client.im.v1.message.update({
        path: { message_id: messageId },
        data: {
          msg_type: 'interactive',
          content: cardJson,
        },
      });
      logger.info('MessageService', `Card ${messageId} updated successfully`);
    } catch (error: any) {
      // Feishu API 只支持更新 text/post 类型，不支持 interactive
      // 对于卡片更新，这只是流式输出的中间状态，忽略这个错误
      const feishuCode = error.response?.data?.code;
      if (feishuCode === 230001) {
        logger.debug('MessageService', `Card update skipped (API不支持更新interactive): ${messageId}`);
        return;
      }
      logger.error('MessageService', `Failed to update card ${messageId}: ${error.message}`);
      if (error.response) {
        logger.error('MessageService', `Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}