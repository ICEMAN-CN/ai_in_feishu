import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { StreamingHandler } from '../src/services/streaming-handler';
import { contextManager } from '../src/services/context-manager';

describe('Integration: 3.3 → 3.4 → 3.5', () => {
  describe('TC-INT-001: Admin API structure validation', () => {
    it('should respond with proper model structure', async () => {
      const app = new Hono();
      const adminRouter = await import('../src/routers/admin').then(m => m.default);
      
      app.route('/api/admin', adminRouter);

      const res = await app.request('/api/admin/models');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty('models');
      expect(Array.isArray(body.models)).toBe(true);
    });
  });

  describe('TC-INT-002: ContextManager truncation in message flow', () => {
    it('should truncate long user message before processing', () => {
      const longMessage = 'a'.repeat(15000);
      const truncated = contextManager.truncateMessage(longMessage);

      expect(truncated.length).toBeLessThanOrEqual(10000 + 30);
      expect(truncated).toContain('[消息已截断');
    });

    it('should preserve short messages unchanged', () => {
      const shortMessage = 'Hello, how are you?';
      const result = contextManager.truncateMessage(shortMessage);

      expect(result).toBe(shortMessage);
      expect(result).not.toContain('截断');
    });

    it('should estimate tokens correctly for mixed content', () => {
      const chinese = '你好世界';
      const english = 'hello';
      const mixed = chinese + english;

      const chineseTokens = contextManager.estimateTokens(chinese);
      const englishTokens = contextManager.estimateTokens(english);
      const mixedTokens = contextManager.estimateTokens(mixed);

      expect(mixedTokens).toBe(chineseTokens + englishTokens);
    });
  });

  describe('TC-INT-003: StreamingHandler with ContextManager', () => {
    it('should create StreamingHandler with all dependencies', async () => {
      const mockLLMRouter = {
        getModelName: vi.fn().mockReturnValue('Test-Model'),
        streamGenerate: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield 'Response';
          },
        }),
      };

      const mockSessionManager = {
        getSessionByThreadId: vi.fn().mockReturnValue({
          id: 'session-1',
          threadId: 'thread-123',
          modelId: 'model-1',
          messageCount: 0,
          createdAt: '',
          updatedAt: '',
        }),
        updateSessionMessage: vi.fn(),
      };

      const mockMessageService = {
        sendCardMessage: vi.fn().mockResolvedValue('msg-456'),
        updateCardMessage: vi.fn().mockResolvedValue(undefined),
      };

      const handler = new StreamingHandler(
        mockLLMRouter as any,
        mockSessionManager as any,
        mockMessageService as any
      );

      await handler.handleUserMessage('chat-123', 'thread-123', 'Short message');

      expect(mockMessageService.sendCardMessage).toHaveBeenCalled();
      expect(mockSessionManager.updateSessionMessage).toHaveBeenCalledWith('session-1', 1);
    });
  });

  describe('TC-INT-004: Token budget calculation', () => {
    it('should reserve 20% for system prompt', () => {
      const budget = contextManager.calculateTokenBudget(10000);
      expect(budget).toBe(8000);
    });

    it('should truncate content exceeding token budget', () => {
      const longContent = 'a'.repeat(10000);
      const result = contextManager.truncateForTokenBudget(longContent, 1000, 800);

      expect(result).toContain('[内容已截断');
    });
  });

  describe('TC-INT-005: History truncation', () => {
    it('should truncate history to 20 messages by default', () => {
      const messages = Array.from({ length: 25 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
      }));

      const truncated = contextManager.truncateHistory(messages);

      expect(truncated.length).toBe(20);
      expect(truncated[0].content).toBe('Message 5');
      expect(truncated[19].content).toBe('Message 24');
    });
  });
});
