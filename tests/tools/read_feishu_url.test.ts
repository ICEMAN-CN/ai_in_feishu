import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadFeishuUrlToolHandler } from '../../src/tools/read_feishu_url';

interface MockToolAuthManager {
  isToolEnabled: (toolName: string) => boolean;
  callToolIfAllowed: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
}

interface MockDocService {
  getDocument: (documentId: string) => Promise<unknown>;
}

describe('ReadFeishuUrlToolHandler', () => {
  let mockToolAuthManager: MockToolAuthManager;
  let mockDocService: MockDocService;
  let handler: ReadFeishuUrlToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockToolAuthManager = {
      isToolEnabled: vi.fn(() => true),
      callToolIfAllowed: vi.fn().mockResolvedValue('Mock document content'),
    };
    mockDocService = {
      getDocument: vi.fn(),
    };
    handler = new ReadFeishuUrlToolHandler(
      mockToolAuthManager as any,
      mockDocService as any
    );
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = handler.getToolDefinition();

      expect(definition.name).toBe('read_feishu_url');
      expect(definition.description).toBe('读取用户提供的飞书文档链接内容，转换为Markdown格式。适用于需要AI阅读并总结文档的场景。');
      expect(definition.parameters.type).toBe('object');
      expect(definition.parameters.properties.url.type).toBe('string');
      expect(definition.parameters.properties.purpose.type).toBe('string');
      expect(definition.parameters.required).toContain('url');
    });
  });

  describe('parseDocumentId (via execute)', () => {
    it('TC-6.1-001: should parse valid feishu docx URL and return documentId', async () => {
      const url = 'https://xxx.feishu.cn/docx/abc123XYZ';
      const result = await handler.execute(url);

      expect(mockToolAuthManager.callToolIfAllowed).toHaveBeenCalledWith('read_document', {
        document_id: 'abc123XYZ',
      });
      expect(result).toContain('【文档内容】');
      expect(result).toContain('Mock document content');
    });

    it('TC-6.1-002: should return null for invalid URL', async () => {
      const url = 'https://invalid-url.com/doc/abc123';
      const result = await handler.execute(url);

      expect(result).toBe('❌ 无法解析文档链接: https://invalid-url.com/doc/abc123');
      expect(mockToolAuthManager.callToolIfAllowed).not.toHaveBeenCalled();
    });

    it('should handle URL without protocol', async () => {
      const url = 'xxx.feishu.cn/docx/docid456';
      const result = await handler.execute(url);

      expect(mockToolAuthManager.callToolIfAllowed).toHaveBeenCalledWith('read_document', {
        document_id: 'docid456',
      });
    });
  });

  describe('execute', () => {
    it('TC-6.1-003: should return formatted content when reading succeeds', async () => {
      const url = 'https://xxx.feishu.cn/docx/validDoc';
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue({
        content: 'Test document content',
      });

      const result = await handler.execute(url);

      expect(result).toContain('【文档内容】');
      expect(result).toContain('Test document content');
    });

    it('TC-6.1-004: should return error message when permission is disabled', async () => {
      mockToolAuthManager.isToolEnabled = vi.fn(() => false);
      const url = 'https://xxx.feishu.cn/docx/someDoc';

      const result = await handler.execute(url);

      expect(result).toBe('❌ 文档读取功能已被禁用');
      expect(mockToolAuthManager.callToolIfAllowed).not.toHaveBeenCalled();
    });

    it('TC-6.1-005: should truncate long content', async () => {
      const longContent = 'A'.repeat(15000);
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue(longContent);
      const url = 'https://xxx.feishu.cn/docx/longDoc';

      const result = await handler.execute(url);

      expect(result).toContain('【文档内容】');
      expect(result.length).toBeLessThanOrEqual(10000 + 50);
      expect(result).toContain('[文档内容已截断，超出最大长度限制]');
    });

    it('should include purpose in result when provided', async () => {
      const url = 'https://xxx.feishu.cn/docx/docWithPurpose';
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue('Content here');

      const result = await handler.execute(url, '总结核心观点');

      expect(result).toContain('【任务】: 总结核心观点');
    });

    it('should handle array content (Feishu blocks)', async () => {
      const blocks = [
        { text: { elements: [{ text_run: { content: 'Block 1' } }] } },
        { text: { elements: [{ text_run: { content: 'Block 2' } }] } },
      ];
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue(blocks);
      const url = 'https://xxx.feishu.cn/docx/blocksDoc';

      const result = await handler.execute(url);

      expect(result).toContain('Block 1');
      expect(result).toContain('Block 2');
    });

    it('should handle string content directly', async () => {
      const content = 'Plain text content';
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue(content);
      const url = 'https://xxx.feishu.cn/docx/stringDoc';

      const result = await handler.execute(url);

      expect(result).toContain(content);
    });

    it('should handle null/undefined content', async () => {
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue(null);
      const url = 'https://xxx.feishu.cn/docx/nullDoc';

      const result = await handler.execute(url);

      expect(result).toContain('【文档内容】');
    });

    it('should return error message when tool call fails', async () => {
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockRejectedValue(new Error('API error'));
      const url = 'https://xxx.feishu.cn/docx/failingDoc';

      const result = await handler.execute(url);

      expect(result).toBe('❌ 读取文档失败: API error');
    });

    it('should extract text from heading blocks', async () => {
      const blocks = [
        { heading1: { elements: [{ text_run: { content: 'Heading 1' } }] } },
        { heading2: { elements: [{ text_run: { content: 'Heading 2' } }] } },
      ];
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue(blocks);
      const url = 'https://xxx.feishu.cn/docx/headingDoc';

      const result = await handler.execute(url);

      expect(result).toContain('Heading 1');
      expect(result).toContain('Heading 2');
    });

    it('should extract text from list blocks', async () => {
      const blocks = [
        { list: { elements: [{ text_run: { content: 'List item 1' } }] } },
      ];
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue(blocks);
      const url = 'https://xxx.feishu.cn/docx/listDoc';

      const result = await handler.execute(url);

      expect(result).toContain('List item 1');
    });
  });
});