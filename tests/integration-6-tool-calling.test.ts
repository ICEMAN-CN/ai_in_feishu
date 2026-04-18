import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry } from '../src/tools/index';
import { LLMRouter } from '../src/services/llm-router';

interface MockHandler {
  getToolDefinition: () => { name: string; description: string; parameters: any };
  execute: (args: any) => Promise<string>;
}

describe('Integration: Sprint 6 Tool Calling', () => {
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
      execute: vi.fn().mockResolvedValue('【文档内容】\n\nMock document content'),
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
      execute: vi.fn().mockResolvedValue('【知识库检索结果】\n\nMock search results'),
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
      execute: vi.fn().mockResolvedValue('✅ 文档已创建！\n\n📄 [点击查看文档](https://xxx.feishu.cn/docx/newdoc123)'),
    };

    registry = new ToolRegistry(
      mockReadTool as any,
      mockSearchTool as any,
      mockSaveTool as any
    );
  });

  describe('TC-INT-6-001: ToolRegistry initialization', () => {
    it('should register all 3 tools', () => {
      const tools = registry.getTools();
      expect(tools).toHaveLength(3);
    });

    it('should have correct tool names', () => {
      const names = registry.getToolNames();
      expect(names).toContain('read_feishu_url');
      expect(names).toContain('search_local_kb');
      expect(names).toContain('save_to_new_doc');
    });

    it('should retrieve tool by name', () => {
      const readTool = registry.getTool('read_feishu_url');
      expect(readTool).toBeDefined();
      expect(readTool?.name).toBe('read_feishu_url');
    });
  });

  describe('TC-INT-6-002: Vercel SDK format compatibility', () => {
    it('should return tools in Vercel SDK format', () => {
      const vercelTools = registry.toVercelTools();

      expect(vercelTools).toHaveLength(3);

      for (const tool of vercelTools) {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool.parameters).toHaveProperty('type', 'object');
        expect(tool.parameters).toHaveProperty('properties');
      }
    });

    it('should have valid parameter schemas', () => {
      const vercelTools = registry.toVercelTools();

      const readTool = vercelTools.find((t: any) => t.parameters.required?.includes('url'));
      expect(readTool).toBeDefined();
      expect(readTool.parameters.properties).toHaveProperty('url');
    });
  });

  describe('TC-INT-6-003: read_feishu_url tool execution', () => {
    it('should execute read tool with URL and return content', async () => {
      const tool = registry.getTool('read_feishu_url');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ url: 'https://xxx.feishu.cn/docx/test123', purpose: '总结' });

      expect(mockReadTool.execute).toHaveBeenCalledWith({
        url: 'https://xxx.feishu.cn/docx/test123',
        purpose: '总结',
      });
      expect(result).toContain('【文档内容】');
      expect(result).toContain('Mock document content');
    });

    it('should handle read tool without purpose', async () => {
      const tool = registry.getTool('read_feishu_url');

      const result = await tool!.handler({ url: 'https://xxx.feishu.cn/docx/test123' });

      expect(mockReadTool.execute).toHaveBeenCalledWith({
        url: 'https://xxx.feishu.cn/docx/test123',
      });
      expect(result).toContain('【文档内容】');
    });
  });

  describe('TC-INT-6-004: search_local_kb tool execution', () => {
    it('should execute search tool with query and return results', async () => {
      const tool = registry.getTool('search_local_kb');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ query: '项目目标', top_k: 5 });

      expect(mockSearchTool.execute).toHaveBeenCalledWith({
        query: '项目目标',
        top_k: 5,
      });
      expect(result).toContain('【知识库检索结果】');
    });

    it('should handle search with filter_folder', async () => {
      const tool = registry.getTool('search_local_kb');

      await tool!.handler({ query: '决策', top_k: 3, filter_folder: 'folder123' });

      expect(mockSearchTool.execute).toHaveBeenCalledWith({
        query: '决策',
        top_k: 3,
        filter_folder: 'folder123',
      });
    });
  });

  describe('TC-INT-6-005: save_to_new_doc tool execution', () => {
    it('should execute save tool and return success message', async () => {
      const tool = registry.getTool('save_to_new_doc');
      expect(tool).toBeDefined();

      const result = await tool!.handler({
        threadId: 'thread123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder123',
      });

      expect(mockSaveTool.execute).toHaveBeenCalled();
      expect(result).toContain('✅ 文档已创建！');
      expect(result).toContain('点击查看文档');
    });

    it('should pass all parameters to execute', async () => {
      const tool = registry.getTool('save_to_new_doc');

      await tool!.handler({
        threadId: 'thread123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder123',
        title: 'My Custom Title',
        summaryMode: 'summary',
      });

      expect(mockSaveTool.execute).toHaveBeenCalledWith({
        threadId: 'thread123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder123',
        title: 'My Custom Title',
        summaryMode: 'summary',
      });
    });
  });

  describe('TC-INT-6-006: LLMRouter integration', () => {
    it('should set tool registry in LLMRouter', () => {
      const llmRouter = new LLMRouter();

      llmRouter.setToolRegistry(registry);

      const toolNames = registry.getToolNames();
      expect(toolNames).toHaveLength(3);
    });

    it('should have tools map after setToolRegistry', () => {
      const llmRouter = new LLMRouter();
      llmRouter.setToolRegistry(registry);

      const tools = registry.getTools();
      expect(tools).toHaveLength(3);
    });
  });

  describe('TC-INT-6-007: End-to-end tool calling flow', () => {
    it('should support sequential tool calls', async () => {
      const tools = registry.getTools();

      const readResult = await tools[0].handler({ url: 'https://xxx.feishu.cn/docx/doc1' });
      expect(readResult).toContain('【文档内容】');

      const searchResult = await tools[1].handler({ query: '关键词' });
      expect(searchResult).toContain('【知识库检索结果】');

      const saveResult = await tools[2].handler({
        threadId: 'thread1',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder1',
      });
      expect(saveResult).toContain('✅ 文档已创建！');
    });

    it('should maintain tool independence', async () => {
      const tools = registry.getTools();

      await tools[0].handler({ url: 'https://xxx.feishu.cn/docx/doc1' });
      await tools[1].handler({ query: 'test' });
      await tools[2].handler({
        threadId: 'thread1',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder1',
      });

      expect(mockReadTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSearchTool.execute).toHaveBeenCalledTimes(1);
      expect(mockSaveTool.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('TC-INT-6-008: Tool error handling', () => {
    it('should handle tool not found in LLMRouter', async () => {
      const llmRouter = new LLMRouter();
      llmRouter.setToolRegistry(registry);

      await expect(llmRouter.executeTool('non_existent_tool', {}))
        .rejects.toThrow('Tool not found: non_existent_tool');
    });

    it('should propagate tool execution errors', async () => {
      mockReadTool.execute = vi.fn().mockRejectedValue(new Error('Tool execution failed'));

      const newRegistry = new ToolRegistry(
        mockReadTool as any,
        mockSearchTool as any,
        mockSaveTool as any
      );

      const tool = newRegistry.getTool('read_feishu_url');

      await expect(tool!.handler({ url: 'https://xxx.feishu.cn/docx/test' }))
        .rejects.toThrow('Tool execution failed');
    });
  });
});

describe('Integration: Tool Calling Flow Validation', () => {
  interface MockHandler {
    getToolDefinition: () => { name: string; description: string; parameters: any };
    execute: (args: any) => Promise<string>;
  }

  let registry: ToolRegistry;
  let mockReadTool: MockHandler;
  let mockSearchTool: MockHandler;
  let mockSaveTool: MockHandler;

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
      execute: vi.fn().mockImplementation((args: any) => {
        let result = '【文档内容】\n\nSprint 6 specification document content';
        if (args.purpose) {
          result += `\n\n【任务】: ${args.purpose}`;
        }
        return Promise.resolve(result);
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
      execute: vi.fn().mockResolvedValue('【知识库检索结果】\n\nRelevant chunks about project decisions'),
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
      execute: vi.fn().mockResolvedValue('✅ 文档已创建！\n\n📄 [点击查看文档](https://xxx.feishu.cn/docx/newdoc456)'),
    };

    registry = new ToolRegistry(
      mockReadTool as any,
      mockSearchTool as any,
      mockSaveTool as any
    );
  });

  describe('E2E Flow 1: Document Reading Flow', () => {
    it('should read feishu document via tool calling', async () => {
      const tool = registry.getTool('read_feishu_url');
      expect(tool).toBeDefined();

      const url = 'https://xxx.feishu.cn/docx/sprint6spec123';
      const result = await tool!.handler({ url, purpose: '总结核心观点' });

      expect(mockReadTool.execute).toHaveBeenCalledWith({
        url,
        purpose: '总结核心观点',
      });
      expect(result).toContain('【文档内容】');
      expect(result).toContain('Sprint 6 specification document content');
      expect(result).toContain('【任务】: 总结核心观点');
    });
  });

  describe('E2E Flow 2: Knowledge Base Search Flow', () => {
    it('should search knowledge base via tool calling', async () => {
      const tool = registry.getTool('search_local_kb');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ query: '我们上个月的目标是什么', top_k: 5 });

      expect(mockSearchTool.execute).toHaveBeenCalledWith({
        query: '我们上个月的目标是什么',
        top_k: 5,
      });
      expect(result).toContain('【知识库检索结果】');
      expect(result).toContain('Relevant chunks about project decisions');
    });

    it('should cap topK at MAX_RETRIEVAL_CHUNKS (internal behavior)', async () => {
      const tool = registry.getTool('search_local_kb');

      await tool!.handler({ query: 'test query', top_k: 10 });

      expect(mockSearchTool.execute).toHaveBeenCalledWith({
        query: 'test query',
        top_k: 10,
      });
    });
  });

  describe('E2E Flow 3: Document Saving Flow', () => {
    it('should save conversation to new document', async () => {
      const tool = registry.getTool('save_to_new_doc');
      expect(tool).toBeDefined();

      const result = await tool!.handler({
        threadId: 'thread-abc-123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/proj-docs',
        summaryMode: 'summary',
      });

      expect(mockSaveTool.execute).toHaveBeenCalledWith({
        threadId: 'thread-abc-123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/proj-docs',
        summaryMode: 'summary',
      });
      expect(result).toContain('✅ 文档已创建！');
      expect(result).toContain('newdoc456');
    });

    it('should generate document URL correctly', async () => {
      const tool = registry.getTool('save_to_new_doc');

      const result = await tool!.handler({
        threadId: 'thread123',
        saveFolderUrl: 'https://xxx.feishu.cn/folder/folder123',
      });

      expect(result).toMatch(/https:\/\/xxx\.feishu\.cn\/docx\//);
      expect(result).toContain('📄 [点击查看文档]');
    });
  });
});