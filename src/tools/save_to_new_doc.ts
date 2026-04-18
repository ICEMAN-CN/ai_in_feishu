import { SessionManager } from '../core/session-manager';
import { LLMRouter } from '../services/llm-router';
import { MCPToolAuthManager } from '../core/mcp-tool-auth';
import { ConversationMessage } from '../types/config';

export interface SaveToNewDocTool {
  name: 'save_to_new_doc';
  description: string;
  parameters: {
    type: 'object';
    properties: {
      title: {
        type: 'string';
        description: '文档标题（可选，不提供则AI自动生成）';
      };
      save_folder_url: {
        type: 'string';
        description: '保存到的飞书文件夹URL';
      };
      summary_mode: {
        type: 'string';
        enum: ['full', 'summary', 'action_items'];
        description: '保存模式：完整记录 / 摘要总结 / 行动项';
        default: 'summary';
      };
    };
    required: ['save_folder_url'];
  };
}

export class SaveToNewDocToolHandler {
  constructor(
    private sessionManager: SessionManager,
    private llmRouter: LLMRouter,
    private toolAuthManager: MCPToolAuthManager
  ) {}

  getToolDefinition(): SaveToNewDocTool {
    return {
      name: 'save_to_new_doc',
      description: '将当前对话内容整理成结构化文档并保存到飞书。仅创建新文档，绝不修改已有文档。',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '文档标题（可选，不提供则AI自动生成）',
          },
          save_folder_url: {
            type: 'string',
            description: '保存到的飞书文件夹URL',
          },
          summary_mode: {
            type: 'string',
            enum: ['full', 'summary', 'action_items'],
            description: '保存模式：完整记录 / 摘要总结 / 行动项',
            default: 'summary',
          },
        },
        required: ['save_folder_url'],
      },
    };
  }

  async execute(
    threadId: string,
    saveFolderUrl: string,
    title?: string,
    summaryMode: 'full' | 'summary' | 'action_items' = 'summary'
  ): Promise<string> {
    if (!this.toolAuthManager.isToolEnabled('create_document')) {
      return '❌ 文档创建功能已被禁用';
    }

    try {
      const session = this.sessionManager.getSessionByThreadId(threadId);
      if (!session) {
        return '❌ 会话不存在';
      }

      const messageLimit = session.messageLimit || 20;
      const conversation = this.sessionManager.getConversation(session.id, messageLimit);

      if (conversation.length === 0) {
        return '❌ 对话内容为空';
      }

      const organizedContent = await this.organizeConversation(conversation, summaryMode);

      const folderToken = this.parseFolderToken(saveFolderUrl);
      if (!folderToken) {
        return '❌ 无法解析文件夹链接';
      }

      const doc = await this.toolAuthManager.callToolIfAllowed('create_document', {
        parent_token: folderToken,
        title: title || this.generateTitle(conversation),
        content: organizedContent,
      });

      const docUrl = (doc as any)?.url || `https://xxx.feishu.cn/docx/${(doc as any)?.documentId}`;
      return `✅ 文档已创建！\n\n📄 [点击查看文档](${docUrl})`;
    } catch (error) {
      console.error('[save_to_new_doc] Failed:', error);
      return `❌ 创建文档失败: ${(error as Error).message}`;
    }
  }

  private async organizeConversation(
    conversation: ConversationMessage[],
    mode: 'full' | 'summary' | 'action_items'
  ): Promise<string> {
    const systemPrompt = this.getOrganizePrompt(mode);

    const result = await this.llmRouter.generate(
      'gpt-4o',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(conversation) }
      ]
    );

    return result;
  }

  private getOrganizePrompt(mode: 'full' | 'summary' | 'action_items'): string {
    switch (mode) {
      case 'full':
        return '请将以下对话内容整理成格式良好的Markdown文档，保持对话的完整性和结构。';
      case 'summary':
        return '请将以下对话内容整理成摘要Markdown文档，提取关键信息、结论和要点。';
      case 'action_items':
        return '请将以下对话内容整理成行动项清单，提取需要执行的任务、负责人和时间节点。';
    }
  }

  private generateTitle(conversation: ConversationMessage[]): string {
    const firstUserMessage = conversation.find(m => m.role === 'user');
    if (!firstUserMessage) {
      return 'AI对话归档';
    }

    const title = firstUserMessage.content.slice(0, 50);
    return `对话归档: ${title}${title.length >= 50 ? '...' : ''}`;
  }

  private parseFolderToken(url: string): string | null {
    const match = url.match(/\/folder\/([a-zA-Z0-9]+)/);
    return match?.[1] || null;
  }
}

export {};