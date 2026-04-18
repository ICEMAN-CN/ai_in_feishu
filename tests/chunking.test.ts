import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSplitText } = vi.hoisted(() => {
  return { mockSplitText: vi.fn() };
});

vi.mock('@langchain/textsplitters', () => {
  return {
    RecursiveCharacterTextSplitter: vi.fn().mockImplementation(() => ({
      splitText: mockSplitText,
    })),
  };
});

import { ChunkingService } from '../src/services/chunking';

describe('ChunkingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-5.3-001: Normal chunking', () => {
    it('should return chunks array for normal text', async () => {
      const service = new ChunkingService();

      // Mock splitText to return 3 chunks of valid length
      mockSplitText.mockResolvedValue([
        'A'.repeat(200) + ' ' + 'B'.repeat(200),
        'B'.repeat(200) + ' ' + 'C'.repeat(200),
        'C'.repeat(200) + ' ' + 'A'.repeat(200),
      ]);

      const chunks = await service.chunkDocument(
        'A'.repeat(200) + ' ' + 'B'.repeat(200) + ' ' + 'C'.repeat(200),
        {
          documentId: 'doc1',
          title: 'Test',
          url: 'https://example.com/doc1',
        }
      );

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('text');
      expect(chunks[0]).toHaveProperty('tokenCount');
      expect(chunks[0]).toHaveProperty('chunkIndex');
    });

    it('should correctly set chunkIndex for each chunk', async () => {
      const service = new ChunkingService();

      mockSplitText.mockResolvedValue([
        'A'.repeat(150),
        'B'.repeat(150),
        'C'.repeat(150),
      ]);

      const chunks = await service.chunkDocument('any text', {
        documentId: 'doc1',
        title: 'Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[1].chunkIndex).toBe(1);
      expect(chunks[2].chunkIndex).toBe(2);
    });
  });

  describe('TC-5.3-002: Empty text', () => {
    it('should return empty array for empty text', async () => {
      const service = new ChunkingService();

      mockSplitText.mockResolvedValue([]);

      const chunks = await service.chunkDocument('', {
        documentId: 'doc1',
        title: 'Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks).toEqual([]);
    });

    it('should return empty array when splitText returns only whitespace', async () => {
      const service = new ChunkingService();

      mockSplitText.mockResolvedValue(['   ', '\n\n', '\t\t']);

      const chunks = await service.chunkDocument('   \n\n\t\t', {
        documentId: 'doc1',
        title: 'Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks).toEqual([]);
    });
  });

  describe('TC-5.3-003: Short text filtered out', () => {
    it('should return empty array for short text', async () => {
      const service = new ChunkingService();

      // Text shorter than 100 characters should be filtered
      mockSplitText.mockResolvedValue(['Short text']);

      const chunks = await service.chunkDocument('Short text', {
        documentId: 'doc1',
        title: 'Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks).toEqual([]);
    });

    it('should filter out chunks shorter than 100 characters', async () => {
      const service = new ChunkingService();

      mockSplitText.mockResolvedValue([
        'This is a very long chunk that has more than 100 characters and should be kept in the result set because it exceeds the minimum',
        'Short', // should be filtered
        'Another very long chunk that exceeds the minimum length requirement and will be preserved for retrieval purposes',
      ]);

      const chunks = await service.chunkDocument('mixed', {
        documentId: 'doc1',
        title: 'Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(2);
      expect(chunks[0].text).toContain('long chunk');
      expect(chunks[1].text).toContain('Another');
    });

    it('should return empty array for text that produces only short chunks', async () => {
      const service = new ChunkingService();

      mockSplitText.mockResolvedValue(['a', 'ab', 'abc', 'short']);

      const chunks = await service.chunkDocument('a ab abc short', {
        documentId: 'doc1',
        title: 'Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks).toEqual([]);
    });
  });

  describe('Token estimation', () => {
    it('should correctly estimate tokens for English text (0.25 per char)', async () => {
      const service = new ChunkingService() as any;

      // 100 characters * 0.25 = 25 tokens
      const text = 'a'.repeat(100);
      const tokenCount = service.estimateTokens(text);

      expect(tokenCount).toBe(25);
    });

    it('should correctly estimate tokens for Chinese text (0.5 per char)', async () => {
      const service = new ChunkingService() as any;

      // 100 Chinese characters * 0.5 = 50 tokens
      const text = '中'.repeat(100);
      const tokenCount = service.estimateTokens(text);

      expect(tokenCount).toBe(50);
    });

    it('should correctly estimate tokens for mixed Chinese/English text', async () => {
      const service = new ChunkingService() as any;

      // 50 English (50 * 0.25 = 12.5) + 50 Chinese (50 * 0.5 = 25) = 37.5, ceil = 38
      const english = 'a'.repeat(50);
      const chinese = '中'.repeat(50);
      const text = english + chinese;

      const tokenCount = service.estimateTokens(text);

      expect(tokenCount).toBe(38);
    });

    it('should correctly estimate tokens for punctuation', async () => {
      const service = new ChunkingService() as any;

      // 100 punctuation chars (charCode <= 127) * 0.25 = 25 tokens
      const text = '.'.repeat(100);
      const tokenCount = service.estimateTokens(text);

      expect(tokenCount).toBe(25);
    });

    it('should return integer token count', async () => {
      const service = new ChunkingService() as any;

      // 99 chars * 0.25 = 24.75, ceil = 25
      const text = 'a'.repeat(99);
      const tokenCount = service.estimateTokens(text);

      expect(Number.isInteger(tokenCount)).toBe(true);
    });
  });

  describe('Chinese text chunking', () => {
    it('should handle pure Chinese text', async () => {
      const service = new ChunkingService();

      const chineseText = '中'.repeat(100);

      mockSplitText.mockResolvedValue([chineseText]);

      const chunks = await service.chunkDocument(chineseText, {
        documentId: 'doc1',
        title: '中文测试',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(chineseText);
      expect(chunks[0].tokenCount).toBe(50);
    });

    it('should handle Chinese text with punctuation', async () => {
      const service = new ChunkingService();

      const chineseTextWithPunctuation = '中'.repeat(80) + '。'.repeat(20);

      mockSplitText.mockResolvedValue([chineseTextWithPunctuation]);

      const chunks = await service.chunkDocument(chineseTextWithPunctuation, {
        documentId: 'doc1',
        title: '中文测试',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(1);
      expect(typeof chunks[0].tokenCount).toBe('number');
    });
  });

  describe('Mixed Chinese/English text', () => {
    it('should handle mixed Chinese and English text', async () => {
      const service = new ChunkingService();

      const mixedText = 'Hello'.repeat(20) + '中'.repeat(20);

      mockSplitText.mockResolvedValue([mixedText]);

      const chunks = await service.chunkDocument(mixedText, {
        documentId: 'doc1',
        title: 'Mixed Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(mixedText);
      expect(typeof chunks[0].tokenCount).toBe('number');
      expect(chunks[0].tokenCount).toBeGreaterThan(0);
    });

    it('should produce correct token count for mixed content', async () => {
      const service = new ChunkingService() as any;

      // "Hello" = 5 chars, "你好" = 2 chars
      const mixed = 'Hello你好';
      const expectedTokens = Math.ceil(5 * 0.25 + 2 * 0.5); // 1.25 + 1 = 2.25, ceil = 3

      const tokenCount = service.estimateTokens(mixed);

      expect(tokenCount).toBe(expectedTokens);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long chunks', async () => {
      const service = new ChunkingService();

      const veryLongText = 'A'.repeat(1000);

      mockSplitText.mockResolvedValue([veryLongText]);

      const chunks = await service.chunkDocument(veryLongText, {
        documentId: 'doc1',
        title: 'Long Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(veryLongText);
      expect(chunks[0].tokenCount).toBe(250); // 1000 * 0.25
    });

    it('should preserve text content exactly', async () => {
      const service = new ChunkingService();

      const exactText = 'This is a very specific text that should be preserved exactly as it is in the chunk output and this adds more chars';

      mockSplitText.mockResolvedValue([exactText]);

      const chunks = await service.chunkDocument(exactText, {
        documentId: 'doc1',
        title: 'Exact Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(exactText);
    });

    it('should handle chunks at exactly 100 characters (boundary)', async () => {
      const service = new ChunkingService();

      const exactly100 = 'A'.repeat(100);

      mockSplitText.mockResolvedValue([exactly100]);

      const chunks = await service.chunkDocument(exactly100, {
        documentId: 'doc1',
        title: 'Boundary Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(1);
    });

    it('should handle chunks at 99 characters (below boundary)', async () => {
      const service = new ChunkingService();

      const exactly99 = 'A'.repeat(99);

      mockSplitText.mockResolvedValue([exactly99]);

      const chunks = await service.chunkDocument(exactly99, {
        documentId: 'doc1',
        title: 'Below Boundary Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(0);
    });

    it('should handle newline-separated text', async () => {
      const service = new ChunkingService();

      const multilineText = 'First paragraph with enough content to pass the 100 character filter.\n\nSecond paragraph with enough content too here.';

      mockSplitText.mockResolvedValue([multilineText]);

      const chunks = await service.chunkDocument(multilineText, {
        documentId: 'doc1',
        title: 'Multiline Test',
        url: 'https://example.com/doc1',
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toContain('First paragraph');
    });
  });
});
