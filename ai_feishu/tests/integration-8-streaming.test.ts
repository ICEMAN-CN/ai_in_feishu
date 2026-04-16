import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingHandler } from '../src/services/streaming-handler';

vi.mock('../src/core/config-store', () => ({
  getEnabledModels: vi.fn(),
  getDefaultModel: vi.fn(),
  saveMessage: vi.fn(),
}));

vi.mock('../src/core/encryption', () => ({
  decryptFromStorage: vi.fn((key: string) => `decrypted_${key}`),
}));

vi.mock('../src/core/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('StreamingHandler + LLMRouter Integration', () => {
  const mockSession = {
    id: 'session-1',
    threadId: 'thread-123',
    modelId: 'model-openai',
    messageCount: 0,
    messageLimit: 20,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    systemPrompt: 'You are a helpful assistant.',
  };

  let mockLLMRouter: any;
  let mockMessageService: any;
  let mockSessionManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLLMRouter = {
      getModelName: vi.fn().mockReturnValue('GPT-4o'),
      streamGenerate: vi.fn(),
    };

    mockMessageService = {
      sendCardMessage: vi.fn().mockResolvedValue('msg-456'),
      updateCardMessage: vi.fn().mockResolvedValue(undefined),
    };

    mockSessionManager = {
      getSessionByThreadId: vi.fn().mockReturnValue({ ...mockSession }),
      updateSessionMessage: vi.fn(),
      getConversation: vi.fn().mockReturnValue([]),
      truncateSessionMessages: vi.fn(),
    };
  });

  describe('IT-8.1: StreamingHandler.handleUserMessage() with mocked LLM', () => {
    it('should handle user message and stream response via mocked LLM', async () => {
      mockLLMRouter.streamGenerate.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Hello';
          yield ' ';
          yield 'World';
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Hi there');

      expect(mockMessageService.sendCardMessage).toHaveBeenCalledTimes(1);
      expect(mockMessageService.updateCardMessage).toHaveBeenCalled();
      expect(mockSessionManager.updateSessionMessage).toHaveBeenCalledWith('session-1', 1);
    });

    it('should pass session context (modelId, systemPrompt) to LLM correctly', async () => {
      const sessionWithSystem = {
        ...mockSession,
        systemPrompt: 'You are a test assistant.',
      };
      mockSessionManager.getSessionByThreadId.mockReturnValue(sessionWithSystem);

      mockLLMRouter.streamGenerate.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Response';
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Hello');

      expect(mockLLMRouter.streamGenerate).toHaveBeenCalledWith(
        'model-openai',
        expect.any(Array),
        'You are a test assistant.'
      );
    });
  });

  describe('IT-8.2: Card update flow (initial → streaming → final)', () => {
    it('should send initial card, streaming updates, then final card', async () => {
      mockLLMRouter.streamGenerate.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Part1 ';
          yield 'Part2 ';
          yield 'Part3';
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Generate');

      const updateCalls = mockMessageService.updateCardMessage.mock.calls;

      const firstUpdateCard = updateCalls[0]?.[1];
      expect(firstUpdateCard?.card?.elements?.[0]?.text?.content).toContain('Part1');

      const finalUpdateCard = updateCalls[updateCalls.length - 1]?.[1];
      const finalContent = finalUpdateCard?.card?.elements?.[0]?.text?.content;
      expect(finalContent).toBe('Part1 Part2 Part3');
      expect(finalContent).not.toContain('▌');
      expect(finalContent).not.toContain('流式输出中');
    });

    it('should update card header with model name throughout flow', async () => {
      mockLLMRouter.streamGenerate.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Test response';
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Hi');

      const initialCard = mockMessageService.sendCardMessage.mock.calls[0]?.[1];
      expect(initialCard?.card?.header?.title?.content).toBe('🤖 GPT-4o');

      const updateCard = mockMessageService.updateCardMessage.mock.calls[0]?.[1];
      expect(updateCard?.card?.header?.title?.content).toBe('🤖 GPT-4o');
    });
  });

  describe('IT-8.3: Error handling - error card sent on failure', () => {
    it('should send error card with red template when LLM throws', async () => {
      mockLLMRouter.streamGenerate.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Partial ';
          throw new Error('API connection failed');
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await expect(
        handler.handleUserMessage('chat-123', 'thread-123', 'Hello')
      ).rejects.toThrow('API connection failed');

      const updateCalls = mockMessageService.updateCardMessage.mock.calls;
      const errorCall = updateCalls[updateCalls.length - 1];
      const errorCard = errorCall?.[1];

      expect(errorCard?.card?.header?.template).toBe('red');
      expect(errorCard?.card?.header?.title?.content).toBe('❌ 错误');
      expect(errorCard?.card?.elements?.[0]?.text?.content).toContain('API connection failed');
    });

    it('should propagate error after sending error card', async () => {
      mockLLMRouter.streamGenerate.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          throw new Error('Stream interrupted');
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await expect(
        handler.handleUserMessage('chat-123', 'thread-123', 'Hello')
      ).rejects.toThrow('Stream interrupted');
    });

    it('should not send card when session not found', async () => {
      mockSessionManager.getSessionByThreadId.mockReturnValue(null);

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService
      );

      await expect(
        handler.handleUserMessage('chat-123', 'thread-123', 'Hello')
      ).rejects.toThrow('Session not found');

      expect(mockMessageService.sendCardMessage).not.toHaveBeenCalled();
    });
  });

  describe('IT-8.4: Session context passed to LLM correctly', () => {
    it('should pass correct modelId from session to streamGenerate', async () => {
      mockLLMRouter.streamGenerate.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'Done';
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Test');

      expect(mockLLMRouter.streamGenerate).toHaveBeenCalledWith(
        'model-openai',
        expect.any(Array),
        'You are a helpful assistant.'
      );
    });

    it('should include conversation history in messages passed to LLM', async () => {
      const conversationHistory = [
        { role: 'user' as const, content: 'Previous message' },
        { role: 'assistant' as const, content: 'Previous response' },
      ];
      mockSessionManager.getConversation.mockReturnValue(conversationHistory);

      let capturedMessages: any;
      mockLLMRouter.streamGenerate.mockImplementation(
        async function* (modelId: string, messages: any[], systemPrompt?: string) {
          capturedMessages = messages;
          yield 'Response';
        }
      );

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'New message');

      expect(capturedMessages).toHaveLength(3);
      expect(capturedMessages[0]?.content).toBe('Previous message');
      expect(capturedMessages[1]?.content).toBe('Previous response');
      expect(capturedMessages[2]?.content).toBe('New message');
    });

    it('should truncate messages that exceed session messageLimit', async () => {
      const limitedSession = {
        ...mockSession,
        messageLimit: 2,
      };
      mockSessionManager.getSessionByThreadId.mockReturnValue(limitedSession);

      const longHistory = [
        { role: 'user' as const, content: 'Msg 1' },
        { role: 'assistant' as const, content: 'Msg 2' },
        { role: 'user' as const, content: 'Msg 3' },
        { role: 'assistant' as const, content: 'Msg 4' },
      ];
      mockSessionManager.getConversation.mockReturnValue(longHistory);

      let capturedMessages: any;
      mockLLMRouter.streamGenerate.mockImplementation(
        async function* (modelId: string, messages: any[], systemPrompt?: string) {
          capturedMessages = messages;
          yield 'Response';
        }
      );

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'New');

      expect(capturedMessages?.length).toBeLessThanOrEqual(3);
      expect(mockSessionManager.truncateSessionMessages).toHaveBeenCalledWith('session-1');
    });

    it('should use AI SDK mock pattern for streamGenerate with text deltas', async () => {
      const textDeltas = ['Hello', ' ', 'World', '!'];
      let callCount = 0;

      mockLLMRouter.streamGenerate.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          while (callCount < textDeltas.length) {
            yield textDeltas[callCount++];
          }
        },
      });

      const handler = new StreamingHandler(
        mockLLMRouter,
        mockSessionManager,
        mockMessageService,
        { updateIntervalMs: 0 }
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Hi');

      const finalUpdateCall = mockMessageService.updateCardMessage.mock.calls.at(-1);
      const finalContent = finalUpdateCall?.[1]?.card?.elements?.[0]?.text?.content;

      expect(finalContent).toBe('Hello World!');
    });
  });
});
