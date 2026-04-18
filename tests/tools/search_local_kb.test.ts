import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchLocalKbToolHandler } from '../../src/tools/search_local_kb';

interface MockRAGPipeline {
  retrieve: (query: string, topK: number) => Promise<string>;
}

interface MockToolAuthManager {
  isToolEnabled: (toolName: string) => boolean;
}

describe('SearchLocalKbToolHandler', () => {
  let mockRAGPipeline: MockRAGPipeline;
  let mockToolAuthManager: MockToolAuthManager;
  let handler: SearchLocalKbToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRAGPipeline = {
      retrieve: vi.fn(),
    };
    mockToolAuthManager = {
      isToolEnabled: vi.fn(() => true),
    };
    handler = new SearchLocalKbToolHandler(
      mockRAGPipeline as any,
      mockToolAuthManager as any
    );
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = handler.getToolDefinition();

      expect(definition.name).toBe('search_local_kb');
      expect(definition.description).toBe('在本地知识库中检索与问题相关的文档片段。适用于询问历史沉淀知识、项目背景、决策记录等场景。');
      expect(definition.parameters.type).toBe('object');
      expect(definition.parameters.properties.query.type).toBe('string');
      expect(definition.parameters.properties.top_k.type).toBe('number');
      expect(definition.parameters.properties.filter_folder.type).toBe('string');
      expect(definition.parameters.required).toContain('query');
    });
  });

  describe('execute', () => {
    it('TC-6.2-001: should return formatted results when search succeeds', async () => {
      const mockResults = '[来源: Doc1](url1)\nContent 1\n\n---\n\n[来源: Doc2](url2)\nContent 2';
      mockRAGPipeline.retrieve = vi.fn().mockResolvedValue(mockResults);

      const result = await handler.execute('test query');

      expect(mockRAGPipeline.retrieve).toHaveBeenCalledWith('test query', 5);
      expect(result).toContain('【知识库检索结果】');
      expect(result).toContain(mockResults);
    });

    it('TC-6.2-002: should return friendly message when no results', async () => {
      mockRAGPipeline.retrieve = vi.fn().mockResolvedValue('');

      const result = await handler.execute('nonexistent query');

      expect(result).toBe('📚 知识库中未找到相关内容。');
    });

    it('TC-6.2-003: should cap topK at MAX_RETRIEVAL_CHUNKS (5)', async () => {
      mockRAGPipeline.retrieve = vi.fn().mockResolvedValue('results');

      await handler.execute('test query', 10);

      expect(mockRAGPipeline.retrieve).toHaveBeenCalledWith('test query', 5);
    });

    it('TC-6.2-004: should return error when permission is disabled', async () => {
      mockToolAuthManager.isToolEnabled = vi.fn(() => false);

      const result = await handler.execute('test query');

      expect(result).toBe('❌ 知识库检索功能已被禁用');
      expect(mockRAGPipeline.retrieve).not.toHaveBeenCalled();
    });

    it('should use default topK when not provided', async () => {
      mockRAGPipeline.retrieve = vi.fn().mockResolvedValue('results');

      await handler.execute('test query');

      expect(mockRAGPipeline.retrieve).toHaveBeenCalledWith('test query', 5);
    });

    it('should pass filterFolder parameter when provided', async () => {
      mockRAGPipeline.retrieve = vi.fn().mockResolvedValue('results');

      await handler.execute('test query', 3, 'folder123');

      expect(mockRAGPipeline.retrieve).toHaveBeenCalledWith('test query', 3);
    });

    it('should handle errors gracefully', async () => {
      mockRAGPipeline.retrieve = vi.fn().mockRejectedValue(new Error('Database error'));

      const result = await handler.execute('test query');

      expect(result).toBe('❌ 检索失败: Database error');
    });

  });
});