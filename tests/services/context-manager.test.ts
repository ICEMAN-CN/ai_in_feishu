import { describe, it, expect } from 'vitest';
import { ContextManager, Message } from '../../src/services/context-manager';

describe('ContextManager', () => {
  const manager = new ContextManager();

  describe('truncateMessage', () => {
    it('TC-3.4-001: should truncate message exceeding max length', () => {
      const longMessage = 'a'.repeat(10001);
      const result = manager.truncateMessage(longMessage);
      
      expect(result.length).toBeLessThanOrEqual(10000 + 30); // +30 for truncation marker
      expect(result).toContain('[消息已截断');
    });

    it('should not truncate message within limit', () => {
      const normalMessage = 'a'.repeat(5000);
      const result = manager.truncateMessage(normalMessage);
      
      expect(result).toBe(normalMessage);
      expect(result).not.toContain('截断');
    });

    it('should handle exactly max length message', () => {
      const exactMessage = 'a'.repeat(10000);
      const result = manager.truncateMessage(exactMessage);
      
      expect(result).toBe(exactMessage);
      expect(result).not.toContain('截断');
    });
  });

  describe('truncateHistory', () => {
    it('TC-3.4-002: should truncate history to last 20 messages', () => {
      const messages: Message[] = Array.from({ length: 25 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
      }));
      
      const result = manager.truncateHistory(messages);
      
      expect(result.length).toBe(20);
      expect(result[0].content).toBe('Message 5'); // First should be message 5
      expect(result[19].content).toBe('Message 24'); // Last should be message 24
    });

    it('should not truncate when within limit', () => {
      const messages: Message[] = Array.from({ length: 10 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
      }));
      
      const result = manager.truncateHistory(messages);
      
      expect(result.length).toBe(10);
    });

    it('should respect custom limit parameter', () => {
      const messages: Message[] = Array.from({ length: 15 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
      }));
      
      const result = manager.truncateHistory(messages, 5);
      
      expect(result.length).toBe(5);
    });
  });

  describe('estimateTokens', () => {
    it('TC-3.4-003: should estimate Chinese text tokens reasonably', () => {
      const chineseText = '你好世界'; // 4 Chinese chars
      const tokens = manager.estimateTokens(chineseText);
      
      expect(tokens).toBe(2); // 4 chars * 0.5 = 2 tokens
    });

    it('should estimate English text tokens reasonably', () => {
      const englishText = 'hello world'; // 11 chars
      const tokens = manager.estimateTokens(englishText);
      
      expect(tokens).toBe(3); // 11 chars * 0.25 = 2.75, ceil = 3
    });

    it('should estimate mixed text correctly', () => {
      const mixedText = '你好hello世界world'; // 4 Chinese + 10 English
      const tokens = manager.estimateTokens(mixedText);
      
      // 4 * 0.5 + 10 * 0.25 = 2 + 2.5 = 4.5, ceil = 5
      expect(tokens).toBe(5);
    });
  });

  describe('calculateTokenBudget', () => {
    it('should reserve 20% for system prompt', () => {
      const budget = manager.calculateTokenBudget(10000);
      
      expect(budget).toBe(8000); // 80% of 10000
    });

    it('should handle small context windows', () => {
      const budget = manager.calculateTokenBudget(100);
      
      expect(budget).toBe(80);
    });
  });

  describe('truncateForTokenBudget', () => {
    it('should not truncate when within budget', () => {
      const content = 'short text';
      const result = manager.truncateForTokenBudget(content, 10000, 100);
      
      expect(result).toBe(content);
    });

    it('should truncate when exceeding budget', () => {
      const longContent = 'a'.repeat(10000);
      const result = manager.truncateForTokenBudget(longContent, 1000, 800);
      
      expect(result).toContain('[内容已截断');
    });
  });

  describe('getConfig / updateConfig', () => {
    it('should return current config', () => {
      const config = manager.getConfig();
      
      expect(config.maxMessageLength).toBe(10000);
      expect(config.threadMessageLimit).toBe(20);
      expect(config.tokenBudgetPercent).toBe(0.2);
    });

    it('should update config partially', () => {
      manager.updateConfig({ maxMessageLength: 5000 });
      const config = manager.getConfig();
      
      expect(config.maxMessageLength).toBe(5000);
      expect(config.threadMessageLimit).toBe(20); // unchanged
    });
  });
});
