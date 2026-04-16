import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry, AITool } from '../../src/tools/index';

interface MockHandler {
  getToolDefinition: () => { name: string; description: string; parameters: any };
  execute: (...args: any[]) => Promise<string>;
}

describe('ToolRegistry', () => {
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
      execute: vi.fn().mockResolvedValue('Mock read result'),
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
      execute: vi.fn().mockResolvedValue('Mock search result'),
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
          },
          required: ['save_folder_url'],
        },
      })),
      execute: vi.fn().mockResolvedValue('Mock save result'),
    };

    registry = new ToolRegistry(
      mockReadTool as any,
      mockSearchTool as any,
      mockSaveTool as any
    );
  });

  describe('getTools', () => {
    it('TC-6.4-001: should return array with 3 tools', () => {
      const tools = registry.getTools();
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual([
        'read_feishu_url',
        'search_local_kb',
        'save_to_new_doc',
      ]);
    });
  });

  describe('toVercelTools', () => {
    it('TC-6.4-002: should return tools in Vercel SDK format', () => {
      const vercelTools = registry.toVercelTools();
      expect(vercelTools).toHaveLength(3);
      for (const tool of vercelTools) {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool.parameters).toHaveProperty('type', 'object');
      }
    });
  });

  describe('getTool', () => {
    it('TC-6.4-003: should return tool by name', () => {
      const tool = registry.getTool('read_feishu_url');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('read_feishu_url');
      expect(tool?.description).toBe('读取用户提供的飞书文档链接内容');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = registry.getTool('non_existent_tool');
      expect(tool).toBeUndefined();
    });
  });

  describe('getToolNames', () => {
    it('TC-6.4-004: should return array of tool names', () => {
      const names = registry.getToolNames();
      expect(names).toEqual(['read_feishu_url', 'search_local_kb', 'save_to_new_doc']);
    });
  });
});

export {};