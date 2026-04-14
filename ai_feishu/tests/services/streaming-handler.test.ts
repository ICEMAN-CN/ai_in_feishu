import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingHandler } from '../../src/services/streaming-handler';

const mockLLMRouter = {
  getModelName: vi.fn(),
  streamGenerate: vi.fn(),
};

const mockSessionManager = {
  getSessionByThreadId: vi.fn(),
  updateSessionMessage: vi.fn(),
};

const mockMessageService = {
  sendCardMessage: vi.fn(),
  updateCardMessage: vi.fn(),
};

describe('StreamingHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-3.3-001: handleUserMessage sends streaming card', () => {
    it('should send initial streaming card on message receive', async () => {
      vi.mocked(mockLLMRouter.getModelName).mockReturnValue('GPT-4o');
      vi.mocked(mockSessionManager.getSessionByThreadId).mockReturnValue({
        id: 'session-1',
        threadId: 'thread-123',
        modelId: 'model-openai',
        messageCount: 0,
        createdAt: '',
        updatedAt: '',
        systemPrompt: null,
      });
      vi.mocked(mockMessageService.sendCardMessage).mockResolvedValue('msg-456');
      vi.mocked(mockLLMRouter.streamGenerate).mockReturnValue({
        async *[Symbol.asyncIterator]() {},
      });

      const handler = new StreamingHandler(
        mockLLMRouter as any,
        mockSessionManager as any,
        mockMessageService as any
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Hello');

      expect(mockMessageService.sendCardMessage).toHaveBeenCalledTimes(1);
      expect(mockMessageService.sendCardMessage).toHaveBeenCalledWith(
        'chat-123',
        expect.objectContaining({
          schema: '2.0',
          card: expect.objectContaining({
            header: expect.objectContaining({
              title: expect.objectContaining({ content: '🤖 GPT-4o' }),
            }),
          }),
        })
      );
    });
  });

  describe('TC-3.3-002: Card updates during streaming', () => {
    it('should call updateCardMessage multiple times for long response', async () => {
      vi.mocked(mockLLMRouter.getModelName).mockReturnValue('GPT-4o');
      vi.mocked(mockSessionManager.getSessionByThreadId).mockReturnValue({
        id: 'session-1',
        threadId: 'thread-123',
        modelId: 'model-openai',
        messageCount: 0,
        createdAt: '',
        updatedAt: '',
        systemPrompt: null,
      });
      vi.mocked(mockMessageService.sendCardMessage).mockResolvedValue('msg-456');
      vi.mocked(mockLLMRouter.streamGenerate).mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Hello';
          yield ' ';
          yield 'World';
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter as any,
        mockSessionManager as any,
        mockMessageService as any,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Hello');

      expect(mockMessageService.updateCardMessage).toHaveBeenCalled();
    });
  });

  describe('TC-3.3-003: Final response has no cursor', () => {
    it('should send final card without cursor after stream completes', async () => {
      vi.mocked(mockLLMRouter.getModelName).mockReturnValue('GPT-4o');
      vi.mocked(mockSessionManager.getSessionByThreadId).mockReturnValue({
        id: 'session-1',
        threadId: 'thread-123',
        modelId: 'model-openai',
        messageCount: 0,
        createdAt: '',
        updatedAt: '',
        systemPrompt: null,
      });
      vi.mocked(mockMessageService.sendCardMessage).mockResolvedValue('msg-456');
      vi.mocked(mockLLMRouter.streamGenerate).mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Hello';
          yield ' World';
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter as any,
        mockSessionManager as any,
        mockMessageService as any,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Hello');

      const lastCall = mockMessageService.updateCardMessage.mock.calls.at(-1);
      const finalCard = lastCall?.[1];
      const content = finalCard?.card?.elements?.[0]?.text?.content;

      expect(content).not.toContain('▌');
      expect(content).not.toContain('流式输出中');
      expect(content).toBe('Hello World');
    });
  });

  describe('TC-3.3-004: Session not found throws error', () => {
    it('should throw descriptive error when session missing', async () => {
      vi.mocked(mockSessionManager.getSessionByThreadId).mockReturnValue(null);

      const handler = new StreamingHandler(
        mockLLMRouter as any,
        mockSessionManager as any,
        mockMessageService as any
      );

      await expect(
        handler.handleUserMessage('chat-123', 'thread-123', 'Hello')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('TC-3.3-005: Stream error handling', () => {
    it('should send error card and preserve partial content', async () => {
      vi.mocked(mockLLMRouter.getModelName).mockReturnValue('GPT-4o');
      vi.mocked(mockSessionManager.getSessionByThreadId).mockReturnValue({
        id: 'session-1',
        threadId: 'thread-123',
        modelId: 'model-openai',
        messageCount: 0,
        createdAt: '',
        updatedAt: '',
        systemPrompt: null,
      });
      vi.mocked(mockMessageService.sendCardMessage).mockResolvedValue('msg-456');
      vi.mocked(mockLLMRouter.streamGenerate).mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Partial ';
          yield 'response';
          throw new Error('API Error');
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter as any,
        mockSessionManager as any,
        mockMessageService as any,
        { updateIntervalMs: 0 }
      );

      await expect(
        handler.handleUserMessage('chat-123', 'thread-123', 'Hello')
      ).rejects.toThrow('API Error');

      const errorCall = mockMessageService.updateCardMessage.mock.calls.at(-1);
      const errorCard = errorCall?.[1];
      expect(errorCard?.card?.header?.template).toBe('red');
    });
  });

  describe('TC-3.3-006: Message count updated', () => {
    it('should increment session message count after response', async () => {
      vi.mocked(mockLLMRouter.getModelName).mockReturnValue('GPT-4o');
      vi.mocked(mockSessionManager.getSessionByThreadId).mockReturnValue({
        id: 'session-1',
        threadId: 'thread-123',
        modelId: 'model-openai',
        messageCount: 5,
        createdAt: '',
        updatedAt: '',
        systemPrompt: null,
      });
      vi.mocked(mockMessageService.sendCardMessage).mockResolvedValue('msg-456');
      vi.mocked(mockLLMRouter.streamGenerate).mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Done';
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter as any,
        mockSessionManager as any,
        mockMessageService as any,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Hello');

      expect(mockSessionManager.updateSessionMessage).toHaveBeenCalledWith('session-1', 1);
    });
  });
});