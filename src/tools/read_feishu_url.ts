import { MCPToolAuthManager } from '../core/mcp-tool-auth';
import { FeishuDocService } from '../services/feishu-doc';

const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '10000', 10);

export interface ReadFeishuUrlTool {
  name: 'read_feishu_url';
  description: string;
  parameters: {
    type: 'object';
    properties: {
      url: {
        type: 'string';
        description: '飞书文档或多维表格的完整URL';
      };
      purpose: {
        type: 'string';
        description: '用户要求AI对文档做什么（如"总结核心观点"、"提取关键数据"）';
      };
    };
    required: ['url'];
  };
}

export class ReadFeishuUrlToolHandler {
  constructor(
    private toolAuthManager: MCPToolAuthManager,
    private _docService: FeishuDocService
  ) {}

  getToolDefinition(): ReadFeishuUrlTool {
    return {
      name: 'read_feishu_url',
      description: '读取用户提供的飞书文档链接内容，转换为Markdown格式。适用于需要AI阅读并总结文档的场景。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '飞书文档或多维表格的完整URL',
          },
          purpose: {
            type: 'string',
            description: '用户要求AI对文档做什么（如"总结核心观点"、"提取关键数据"）',
          },
        },
        required: ['url'],
      },
    };
  }

  async execute(url: string, purpose?: string): Promise<string> {
    if (!this.toolAuthManager.isToolEnabled('read_document')) {
      return '❌ 文档读取功能已被禁用';
    }

    const documentId = this.parseDocumentId(url);
    if (!documentId) {
      return `❌ 无法解析文档链接: ${url}`;
    }

    try {
      const content = await this.toolAuthManager.callToolIfAllowed('read_document', {
        document_id: documentId,
      });

      const markdown = this.convertToMarkdown(content);
      const truncated = this.truncateIfNeeded(markdown);

      let result = `【文档内容】\n\n${truncated}`;
      if (purpose) {
        result += `\n\n【任务】: ${purpose}`;
      }

      return result;
    } catch (error) {
      console.error('[read_feishu_url] Failed:', error);
      return `❌ 读取文档失败: ${(error as Error).message}`;
    }
  }

  private parseDocumentId(url: string): string | null {
    const match = url.match(/\/docx\/([a-zA-Z0-9]+)/);
    return match?.[1] || null;
  }

  private convertToMarkdown(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    if (content === null || content === undefined) {
      return '';
    }
    if (Array.isArray(content)) {
      const texts: string[] = [];
      for (const block of content) {
        const text = this.extractTextFromBlock(block);
        if (text) {
          texts.push(text);
        }
      }
      return texts.join('\n\n');
    }
    if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  }

  private extractTextFromBlock(block: unknown): string {
    if (!block || typeof block !== 'object') {
      return '';
    }

    const b = block as Record<string, unknown>;
    const textBlock = b.text as { elements?: Array<{ text_run?: { content?: string } }> } | undefined;
    if (textBlock?.elements) {
      return textBlock.elements.map(el => el.text_run?.content || '').join('');
    }

    for (const headingKey of ['heading1', 'heading2', 'heading3']) {
      const headingBlock = b[headingKey] as { elements?: Array<{ text_run?: { content?: string } }> } | undefined;
      if (headingBlock?.elements) {
        return headingBlock.elements.map(el => el.text_run?.content || '').join('');
      }
    }

    const listBlock = b.list as { elements?: Array<{ text_run?: { content?: string } }> } | undefined;
    if (listBlock?.elements) {
      return listBlock.elements.map(el => el.text_run?.content || '').join('');
    }

    return '';
  }

  private truncateIfNeeded(text: string): string {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      return text;
    }
    return text.slice(0, MAX_MESSAGE_LENGTH) +
      '\n\n[文档内容已截断，超出最大长度限制]';
  }
}

export {};