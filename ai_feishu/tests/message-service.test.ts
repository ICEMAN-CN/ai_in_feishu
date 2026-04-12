import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageService } from '../src/feishu/message-service';

const mockMessageCreate = vi.fn();
const mockMessageUpdate = vi.fn();

const mockClient = {
  im: {
    v1: {
      message: {
        create: mockMessageCreate,
        update: mockMessageUpdate,
      },
    },
  },
} as any;

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MessageService(mockClient);
  });

  describe('sendTextMessage()', () => {
    it('should send text message and return message_id', async () => {
      mockMessageCreate.mockResolvedValue({
        data: { message_id: 'msg_123' },
      });

      const result = await service.sendTextMessage('chat_456', 'Hello World');

      expect(result).toBe('msg_123');
      expect(mockMessageCreate).toHaveBeenCalledWith({
        data: {
          receive_id: 'chat_456',
          msg_type: 'text',
          content: JSON.stringify({ text: 'Hello World' }),
        },
      });
    });

    it('should handle empty content', async () => {
      mockMessageCreate.mockResolvedValue({
        data: { message_id: 'msg_empty' },
      });

      const result = await service.sendTextMessage('chat_456', '');

      expect(result).toBe('msg_empty');
      expect(mockMessageCreate).toHaveBeenCalledWith({
        data: {
          receive_id: 'chat_456',
          msg_type: 'text',
          content: JSON.stringify({ text: '' }),
        },
      });
    });

    it('should propagate SDK errors', async () => {
      mockMessageCreate.mockRejectedValue(new Error('SDK Error'));

      await expect(service.sendTextMessage('chat_456', 'test')).rejects.toThrow('SDK Error');
    });
  });

  describe('sendCardMessage()', () => {
    it('should send card message and return message_id', async () => {
      const card = { schema: '2.0', card: { elements: [] } };
      mockMessageCreate.mockResolvedValue({
        data: { message_id: 'card_msg_789' },
      });

      const result = await service.sendCardMessage('chat_456', card);

      expect(result).toBe('card_msg_789');
      expect(mockMessageCreate).toHaveBeenCalledWith({
        data: {
          receive_id: 'chat_456',
          msg_type: 'interactive',
          content: JSON.stringify(card),
        },
      });
    });

    it('should send complex card structure', async () => {
      const card = {
        schema: '2.0',
        card: {
          header: { title: { tag: 'plain_text', content: 'Test' } },
          elements: [{ tag: 'div', text: { tag: 'lark_md', content: 'Hi' } }],
        },
      };
      mockMessageCreate.mockResolvedValue({
        data: { message_id: 'complex_card' },
      });

      const result = await service.sendCardMessage('chat_123', card);

      expect(result).toBe('complex_card');
      expect(mockMessageCreate).toHaveBeenCalledWith({
        data: {
          receive_id: 'chat_123',
          msg_type: 'interactive',
          content: JSON.stringify(card),
        },
      });
    });

    it('should propagate SDK errors', async () => {
      mockMessageCreate.mockRejectedValue(new Error('Card Send Failed'));

      const card = { schema: '2.0', card: { elements: [] } };
      await expect(service.sendCardMessage('chat_456', card)).rejects.toThrow('Card Send Failed');
    });
  });

  describe('updateCardMessage()', () => {
    it('should update card message', async () => {
      const updatedCard = {
        schema: '2.0',
        card: {
          header: { title: { tag: 'plain_text', content: 'Updated' } },
          elements: [{ tag: 'div', text: { tag: 'lark_md', content: 'New content' } }],
        },
      };
      mockMessageUpdate.mockResolvedValue({});

      await service.updateCardMessage('msg_123', updatedCard);

      expect(mockMessageUpdate).toHaveBeenCalledWith({
        path: { message_id: 'msg_123' },
        data: {
          msg_type: 'interactive',
          content: JSON.stringify(updatedCard),
        },
      });
    });

    it('should handle update with empty card', async () => {
      mockMessageUpdate.mockResolvedValue({});

      await service.updateCardMessage('msg_empty', { schema: '2.0', card: { elements: [] } });

      expect(mockMessageUpdate).toHaveBeenCalledWith({
        path: { message_id: 'msg_empty' },
        data: {
          msg_type: 'interactive',
          content: JSON.stringify({ schema: '2.0', card: { elements: [] } }),
        },
      });
    });

    it('should propagate SDK errors', async () => {
      mockMessageUpdate.mockRejectedValue(new Error('Update Failed'));

      const card = { schema: '2.0', card: { elements: [] } };
      await expect(service.updateCardMessage('msg_456', card)).rejects.toThrow('Update Failed');
    });
  });
});