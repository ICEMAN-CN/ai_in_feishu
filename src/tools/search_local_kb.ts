import { RAGPipeline } from '../services/rag-pipeline';
import { MCPToolAuthManager } from '../core/mcp-tool-auth';

const MAX_RETRIEVAL_CHUNKS = parseInt(process.env.MAX_RETRIEVAL_CHUNKS || '5', 10);

export interface SearchLocalKbTool {
  name: 'search_local_kb';
  description: string;
  parameters: {
    type: 'object';
    properties: {
      query: {
        type: 'string';
        description: '用户的检索query';
      };
      top_k: {
        type: 'number';
        description: '返回最相关的chunk数量';
        default: 5;
      };
      filter_folder: {
        type: 'string';
        description: '可选，限定在特定文件夹中检索';
      };
    };
    required: ['query'];
  };
}

export class SearchLocalKbToolHandler {
  constructor(
    private ragPipeline: RAGPipeline,
    private toolAuthManager: MCPToolAuthManager
  ) {}

  getToolDefinition(): SearchLocalKbTool {
    return {
      name: 'search_local_kb',
      description: '在本地知识库中检索与问题相关的文档片段。适用于询问历史沉淀知识、项目背景、决策记录等场景。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '用户的检索query',
          },
          top_k: {
            type: 'number',
            description: '返回最相关的chunk数量',
            default: 5,
          },
          filter_folder: {
            type: 'string',
            description: '可选，限定在特定文件夹中检索',
          },
        },
        required: ['query'],
      },
    };
  }

  async execute(
    query: string,
    topK: number = MAX_RETRIEVAL_CHUNKS,
    filterFolder?: string
  ): Promise<string> {
    if (!this.toolAuthManager.isToolEnabled('search_wiki_or_drive')) {
      return '❌ 知识库检索功能已被禁用';
    }

    try {
      const actualTopK = Math.min(topK, MAX_RETRIEVAL_CHUNKS);

      const results = await this.ragPipeline.retrieve(query, actualTopK);

      if (!results) {
        return '📚 知识库中未找到相关内容。';
      }

      return `【知识库检索结果】\n\n${results}`;
    } catch (error) {
      console.error('[search_local_kb] Failed:', error);
      return `❌ 检索失败: ${(error as Error).message}`;
    }
  }
}

export {};