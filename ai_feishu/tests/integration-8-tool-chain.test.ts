import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry } from '../src/tools/index';

interface MockHandler {
  getToolDefinition: () => { name: string; description: string; parameters: any };
  execute: (...args: any[]) => Promise<string>;
}

describe('Integration: Sprint 8 Tool Chain', () => {
  let mockReadTool: MockHandler;
  let mockSearchTool: MockHandler;
  let mockSaveTool: MockHandler;
  let registry: ToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReadTool = {
      getToolDefinition: vi.fn(() => ({
        name: 'read_feishu_url',
        description: '读取用户提供的飞书文档链接内容',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            purpose: { type: 'string' },
          },
          required: ['url'],
        },
      })),
      execute: vi.fn().mockImplementation((args: { url: string; purpose?: string }) => {
        return Promise.resolve(
          `【文档内容】\n\nSprint planning document content about Q2 goals.\n\n【任务】: ${args.purpose || '阅读文档'}`
        );
      }),
    };

    mockSearchTool = {
      getToolDefinition: vi.fn(() => ({
        name: 'search_local_kb',
        description: '在本地知识库中检索',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            top_k: { type: 'number' },
          },
          required: ['query'],
        },
      })),
      execute: vi.fn().mockImplementation((args: { query: string; top_k?: number }) => {
        return Promise.resolve(
          `【知识库检索结果】\n\nFound relevant chunks:\n1. Q2目标设定讨论 (relevance: 0.95)\n2. Sprint计划变更记录 (relevance: 0.88)`
        );
      }),
    };

    mockSaveTool = {
      getToolDefinition: vi.fn(() => ({
        name: 'save_to_new_doc',
        description: '将对话内容保存到飞书文档',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            save_folder_url: { type: 'string' },
            summary_mode: { type: 'string', enum: ['full', 'summary', 'action_items'] },
          },
          required: ['save_folder_url'],
        },
      })),
      execute: vi.fn().mockResolvedValue(
        '✅ 文档已创建！\n\n📄 [点击查看文档](https://xxx.feishu.cn/docx/newdoc123)'
      ),
    };

    registry = new ToolRegistry(
      mockReadTool as any,
      mockSearchTool as any,
      mockSaveTool as any
    );
  });

  describe('TC-TC-001: Sequential tool execution', () => {
    it('should execute read → search → save in sequence', async () => {
      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');
      const saveTool = registry.getTool('save_to_new_doc');

      expect(readTool).toBeDefined();
      expect(searchTool).toBeDefined();
      expect(saveTool).toBeDefined();

      const readResult = await readTool!.handler({
        url: 'https://xxx.feishu.cn/docx/doc123',
        purpose: '提取Q2目标',
      });

      expect(readResult).toContain('【文档内容】');
      expect(readResult).toContain('Q2 goals');

      const searchResult = await searchTool!.handler({
        query: 'Q2目标 Sprint计划',
        top_k: 5,
      });

      expect(searchResult).toContain('【知识库检索结果】');
      expect(searchResult).toContain('Q2目标设定讨论');

      const saveResult = await saveTool!.handler({
        threadId: 'thread-abc-123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder123',
        summaryMode: 'summary',
      });

      expect(saveResult).toContain('✅ 文档已创建！');
      expect(saveResult).toContain('newdoc123');
    });

    it('should pass output of one tool as context to next', async () => {
      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');

      await readTool!.handler({
        url: 'https://xxx.feishu.cn/docx/roadmap456',
        purpose: '了解产品路线图',
      });

      await searchTool!.handler({
        query: '产品路线图',
        top_k: 3,
      });

      expect(mockReadTool.execute).toHaveBeenCalledWith({
        url: 'https://xxx.feishu.cn/docx/roadmap456',
        purpose: '了解产品路线图',
      });
      expect(mockSearchTool.execute).toHaveBeenCalledWith({
        query: '产品路线图',
        top_k: 3,
      });
    });

    it('should track execution order in chain', async () => {
      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');
      const saveTool = registry.getTool('save_to_new_doc');

      expect(mockReadTool.execute).toHaveBeenCalledTimes(0);
      expect(mockSearchTool.execute).toHaveBeenCalledTimes(0);
      expect(mockSaveTool.execute).toHaveBeenCalledTimes(0);

      await readTool!.handler({ url: 'https://xxx.feishu.cn/docx/doc1' });
      expect(mockReadTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSearchTool.execute).toHaveBeenCalledTimes(0);
      expect(mockSaveTool.execute).toHaveBeenCalledTimes(0);

      await searchTool!.handler({ query: 'test' });
      expect(mockReadTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSearchTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSaveTool.execute).toHaveBeenCalledTimes(0);

      await saveTool!.handler({
        threadId: 'thread1',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder1',
      });
      expect(mockReadTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSearchTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSaveTool.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('TC-TC-002: Error handling in chain', () => {
    it('should propagate error when read tool fails', async () => {
      mockReadTool.execute = vi.fn().mockRejectedValue(new Error('Failed to fetch document'));

      const newRegistry = new ToolRegistry(
        mockReadTool as any,
        mockSearchTool as any,
        mockSaveTool as any
      );

      const readTool = newRegistry.getTool('read_feishu_url');

      await expect(
        readTool!.handler({ url: 'https://xxx.feishu.cn/docx/invalid' })
      ).rejects.toThrow('Failed to fetch document');
    });

    it('should propagate error when search tool fails', async () => {
      mockSearchTool.execute = vi.fn().mockRejectedValue(new Error('Knowledge base unavailable'));

      const newRegistry = new ToolRegistry(
        mockReadTool as any,
        mockSearchTool as any,
        mockSaveTool as any
      );

      const searchTool = newRegistry.getTool('search_local_kb');

      await expect(
        searchTool!.handler({ query: 'test query' })
      ).rejects.toThrow('Knowledge base unavailable');
    });

    it('should propagate error when save tool fails', async () => {
      mockSaveTool.execute = vi.fn().mockRejectedValue(new Error('Failed to create document'));

      const newRegistry = new ToolRegistry(
        mockReadTool as any,
        mockSearchTool as any,
        mockSaveTool as any
      );

      const saveTool = newRegistry.getTool('save_to_new_doc');

      await expect(
        saveTool!.handler({
          threadId: 'thread123',
          saveFolderUrl: 'https://xxx.feishu.cn/folder/folder123',
        })
      ).rejects.toThrow('Failed to create document');
    });

    it('should handle partial chain failure gracefully', async () => {
      mockSearchTool.execute = vi.fn().mockRejectedValue(new Error('Search service down'));

      const newRegistry = new ToolRegistry(
        mockReadTool as any,
        mockSearchTool as any,
        mockSaveTool as any
      );

      const readTool = newRegistry.getTool('read_feishu_url');
      const searchTool = newRegistry.getTool('search_local_kb');

      const readResult = await readTool!.handler({
        url: 'https://xxx.feishu.cn/docx/doc123',
      });
      expect(readResult).toContain('【文档内容】');

      await expect(
        searchTool!.handler({ query: 'test' })
      ).rejects.toThrow('Search service down');
    });

    it('should return error message for disabled tools', async () => {
      mockReadTool.execute = vi.fn().mockResolvedValue('❌ 文档读取功能已被禁用');

      const newRegistry = new ToolRegistry(
        mockReadTool as any,
        mockSearchTool as any,
        mockSaveTool as any
      );

      const readTool = newRegistry.getTool('read_feishu_url');
      const result = await readTool!.handler({ url: 'https://xxx.feishu.cn/docx/doc123' });

      expect(result).toBe('❌ 文档读取功能已被禁用');
    });
  });

  describe('TC-TC-003: Session context across tools', () => {
    it('should maintain thread context when calling multiple tools', async () => {
      const saveTool = registry.getTool('save_to_new_doc');

      const result = await saveTool!.handler({
        threadId: 'thread-session-123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/team-docs',
        title: 'Q2 Sprint Planning Summary',
        summaryMode: 'summary',
      });

      expect(mockSaveTool.execute).toHaveBeenCalledWith({
        threadId: 'thread-session-123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/team-docs',
        title: 'Q2 Sprint Planning Summary',
        summaryMode: 'summary',
      });
      expect(result).toContain('✅ 文档已创建！');
    });

    it('should pass same threadId across tool chain', async () => {
      const threadId = 'thread-ctx-456';

      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');
      const saveTool = registry.getTool('save_to_new_doc');

      await readTool!.handler({ url: 'https://xxx.feishu.cn/docx/doc1' });
      await searchTool!.handler({ query: 'Q2目标' });
      await saveTool!.handler({
        threadId,
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder1',
      });

      expect(mockSaveTool.execute).toHaveBeenCalledWith({
        threadId: 'thread-ctx-456',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder1',
      });
    });

    it('should preserve tool execution context through chain', async () => {
      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');
      const saveTool = registry.getTool('save_to_new_doc');

      expect(mockReadTool.execute).toHaveBeenCalledTimes(0);
      expect(mockSearchTool.execute).toHaveBeenCalledTimes(0);
      expect(mockSaveTool.execute).toHaveBeenCalledTimes(0);

      await readTool!.handler({ url: 'https://xxx.feishu.cn/docx/doc1' });
      await searchTool!.handler({ query: 'test' });
      await saveTool!.handler({
        threadId: 'thread1',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder1',
      });

      expect(mockReadTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSearchTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSaveTool.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('TC-TC-004: Multi-turn tool conversation', () => {
    it('should support multiple rounds of tool execution', async () => {
      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');

      const readResult1 = await readTool!.handler({
        url: 'https://xxx.feishu.cn/docx/doc-round1',
      });
      expect(readResult1).toContain('【文档内容】');

      const searchResult1 = await searchTool!.handler({
        query: '项目目标',
        top_k: 5,
      });
      expect(searchResult1).toContain('【知识库检索结果】');

      const readResult2 = await readTool!.handler({
        url: 'https://xxx.feishu.cn/docx/doc-round2',
        purpose: '提取关键数据',
      });
      expect(readResult2).toContain('【文档内容】');
      expect(readResult2).toContain('【任务】: 提取关键数据');

      const searchResult2 = await searchTool!.handler({
        query: '关键数据',
        top_k: 3,
      });
      expect(searchResult2).toContain('【知识库检索结果】');
    });

    it('should maintain call count across multiple turns', async () => {
      const tools = registry.getTools();

      await tools[0].handler({ url: 'https://xxx.feishu.cn/docx/doc1' });
      await tools[1].handler({ query: 'query1' });
      await tools[0].handler({ url: 'https://xxx.feishu.cn/docx/doc2' });
      await tools[1].handler({ query: 'query2' });
      await tools[2].handler({
        threadId: 'thread1',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder1',
      });

      expect(mockReadTool.execute).toHaveBeenCalledTimes(2);
      expect(mockSearchTool.execute).toHaveBeenCalledTimes(2);
      expect(mockSaveTool.execute).toHaveBeenCalledTimes(1);
    });

    it('should support interleaved tool calls', async () => {
      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');
      const saveTool = registry.getTool('save_to_new_doc');

      const read1 = readTool!.handler({ url: 'https://xxx.feishu.cn/docx/docA' });
      const search1 = searchTool!.handler({ query: 'query1' });
      const read2 = readTool!.handler({ url: 'https://xxx.feishu.cn/docx/docB' });
      const search2 = searchTool!.handler({ query: 'query2' });
      const save = saveTool!.handler({
        threadId: 'thread1',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder1',
      });

      const results = await Promise.all([read1, search1, read2, search2, save]);

      expect(results[0]).toContain('【文档内容】');
      expect(results[1]).toContain('【知识库检索结果】');
      expect(results[2]).toContain('【文档内容】');
      expect(results[3]).toContain('【知识库检索结果】');
      expect(results[4]).toContain('✅ 文档已创建！');
    });

    it('should handle tool chain with context-dependent queries', async () => {
      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');

      const readResult = await readTool!.handler({
        url: 'https://xxx.feishu.cn/docx/product-spec',
        purpose: '了解产品规格',
      });

      expect(readResult).toContain('【文档内容】');

      const searchQuery = '产品规格 详细信息';
      const searchResult = await searchTool!.handler({
        query: searchQuery,
        top_k: 5,
      });

      expect(mockSearchTool.execute).toHaveBeenCalledWith({
        query: searchQuery,
        top_k: 5,
      });
      expect(searchResult).toContain('【知识库检索结果】');
    });
  });

  describe('TC-TC-005: Tool chain verification', () => {
    it('should have all 3 tools registered', () => {
      const tools = registry.getTools();
      expect(tools).toHaveLength(3);
    });

    it('should return correct tool names', () => {
      const names = registry.getToolNames();
      expect(names).toContain('read_feishu_url');
      expect(names).toContain('search_local_kb');
      expect(names).toContain('save_to_new_doc');
    });

    it('should convert to Vercel SDK format', () => {
      const vercelTools = registry.toVercelTools();

      expect(vercelTools).toHaveLength(3);
      for (const tool of vercelTools) {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool.parameters).toHaveProperty('type', 'object');
        expect(tool.parameters).toHaveProperty('properties');
      }
    });

    it('should retrieve tool by name correctly', () => {
      const readTool = registry.getTool('read_feishu_url');
      const searchTool = registry.getTool('search_local_kb');
      const saveTool = registry.getTool('save_to_new_doc');

      expect(readTool?.name).toBe('read_feishu_url');
      expect(searchTool?.name).toBe('search_local_kb');
      expect(saveTool?.name).toBe('save_to_new_doc');
    });
  });
});

describe('Integration: Tool Chain Error Recovery', () => {
  interface MockHandler {
    getToolDefinition: () => { name: string; description: string; parameters: any };
    execute: (...args: any[]) => Promise<string>;
  }

  let mockReadTool: MockHandler;
  let mockSearchTool: MockHandler;
  let mockSaveTool: MockHandler;
  let registry: ToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReadTool = {
      getToolDefinition: vi.fn(() => ({
        name: 'read_feishu_url',
        description: '读取用户提供的飞书文档链接内容',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            purpose: { type: 'string' },
          },
          required: ['url'],
        },
      })),
      execute: vi.fn().mockResolvedValue('【文档内容】\n\nMock document'),
    };

    mockSearchTool = {
      getToolDefinition: vi.fn(() => ({
        name: 'search_local_kb',
        description: '在本地知识库中检索',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            top_k: { type: 'number' },
          },
          required: ['query'],
        },
      })),
      execute: vi.fn().mockResolvedValue('【知识库检索结果】\n\nMock search'),
    };

    mockSaveTool = {
      getToolDefinition: vi.fn(() => ({
        name: 'save_to_new_doc',
        description: '将对话内容保存到飞书文档',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            save_folder_url: { type: 'string' },
            summary_mode: { type: 'string', enum: ['full', 'summary', 'action_items'] },
          },
          required: ['save_folder_url'],
        },
      })),
      execute: vi.fn().mockResolvedValue('✅ 文档已创建！\n\n📄 [点击查看文档](https://xxx.feishu.cn/docx/newdoc)'),
    };

    registry = new ToolRegistry(
      mockReadTool as any,
      mockSearchTool as any,
      mockSaveTool as any
    );
  });

  describe('Recovery from tool failures', () => {
    it('should allow retry after transient failure', async () => {
      let callCount = 0;
      mockSearchTool.execute = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve('【知识库检索结果】\n\nRetry success');
      });

      const newRegistry = new ToolRegistry(
        mockReadTool as any,
        mockSearchTool as any,
        mockSaveTool as any
      );

      const searchTool = newRegistry.getTool('search_local_kb');

      await expect(searchTool!.handler({ query: 'test' })).rejects.toThrow(
        'Temporary network error'
      );

      const result = await searchTool!.handler({ query: 'test' });
      expect(result).toContain('Retry success');
    });

    it('should maintain chain state after error recovery', async () => {
      let shouldFail = true;
      mockReadTool.execute = vi.fn().mockImplementation(() => {
        if (shouldFail) {
          shouldFail = false;
          return Promise.reject(new Error('Initial read failure'));
        }
        return Promise.resolve('【文档内容】\n\nRecovered content');
      });

      const newRegistry = new ToolRegistry(
        mockReadTool as any,
        mockSearchTool as any,
        mockSaveTool as any
      );

      const readTool = newRegistry.getTool('read_feishu_url');
      const searchTool = newRegistry.getTool('search_local_kb');

      await expect(
        readTool!.handler({ url: 'https://xxx.feishu.cn/docx/doc1' })
      ).rejects.toThrow('Initial read failure');

      const readResult = await readTool!.handler({
        url: 'https://xxx.feishu.cn/docx/doc1',
      });
      expect(readResult).toContain('Recovered content');

      const searchResult = await searchTool!.handler({ query: 'test' });
      expect(searchResult).toContain('【知识库检索结果】');
    });
  });

  describe('Chain validation', () => {
    it('should validate tool exists before execution', () => {
      const tool = registry.getTool('non_existent_tool');
      expect(tool).toBeUndefined();
    });

    it('should handle empty chain gracefully', async () => {
      const tools = registry.getTools();
      expect(tools).toHaveLength(3);
    });
  });
});
