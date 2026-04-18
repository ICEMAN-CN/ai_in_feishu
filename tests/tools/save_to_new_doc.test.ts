import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveToNewDocToolHandler } from '../../src/tools/save_to_new_doc';
import { ConversationMessage } from '../../src/types/config';

interface MockSessionManager {
  getSessionByThreadId: (threadId: string) => any;
  getConversation: (sessionId: string, limit?: number) => ConversationMessage[];
}

interface MockLLMRouter {
  generate: (modelId: string, messages: any[]) => Promise<string>;
}

interface MockToolAuthManager {
  isToolEnabled: (toolName: string) => boolean;
  callToolIfAllowed: (toolName: string, args: Record<string, unknown>) => Promise<any>;
}

describe('SaveToNewDocToolHandler', () => {
  let mockSessionManager: MockSessionManager;
  let mockLLMRouter: MockLLMRouter;
  let mockToolAuthManager: MockToolAuthManager;
  let handler: SaveToNewDocToolHandler;

  const mockConversation: ConversationMessage[] = [
    {
      id: '1',
      sessionId: 'session1',
      role: 'user',
      content: 'What is the project timeline?',
      messageId: 'msg1',
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      sessionId: 'session1',
      role: 'assistant',
      content: 'The project timeline is 3 months.',
      messageId: 'msg2',
      createdAt: '2024-01-01T10:01:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionManager = {
      getSessionByThreadId: vi.fn(),
      getConversation: vi.fn(),
    };
    mockLLMRouter = {
      generate: vi.fn(),
    };
    mockToolAuthManager = {
      isToolEnabled: vi.fn(() => true),
      callToolIfAllowed: vi.fn(),
    };

    mockSessionManager.getSessionByThreadId = vi.fn().mockReturnValue({
      id: 'session1',
      threadId: 'thread123',
      messageLimit: 20,
    });
    mockSessionManager.getConversation = vi.fn().mockReturnValue(mockConversation);
    mockLLMRouter.generate = vi.fn().mockResolvedValue('# Organized Content\n\nSummary here.');
    mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue({
      url: 'https://xxx.feishu.cn/docx/newdoc123',
      documentId: 'newdoc123',
    });

    handler = new SaveToNewDocToolHandler(
      mockSessionManager as any,
      mockLLMRouter as any,
      mockToolAuthManager as any
    );
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = handler.getToolDefinition();

      expect(definition.name).toBe('save_to_new_doc');
      expect(definition.description).toBe('将当前对话内容整理成结构化文档并保存到飞书。仅创建新文档，绝不修改已有文档。');
      expect(definition.parameters.type).toBe('object');
      expect(definition.parameters.properties.title.type).toBe('string');
      expect(definition.parameters.properties.save_folder_url.type).toBe('string');
      expect(definition.parameters.properties.summary_mode.enum).toEqual(['full', 'summary', 'action_items']);
      expect(definition.parameters.required).toContain('save_folder_url');
    });
  });

  describe('execute', () => {
    it('TC-6.3-001: should create document with full mode', async () => {
      const result = await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123', undefined, 'full');

      expect(mockLLMRouter.generate).toHaveBeenCalledWith('gpt-4o', expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
      ]));
      const callArgs = (mockLLMRouter.generate as any).mock.calls[0][1];
      const systemMsg = callArgs.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('完整');
      expect(result).toContain('✅ 文档已创建！');
      expect(result).toContain('点击查看文档');
    });

    it('TC-6.3-002: should create document with summary mode', async () => {
      const result = await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123', undefined, 'summary');

      const callArgs = (mockLLMRouter.generate as any).mock.calls[0][1];
      const systemMsg = callArgs.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('摘要');
      expect(result).toContain('✅ 文档已创建！');
    });

    it('TC-6.3-003: should create document with action_items mode', async () => {
      const result = await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123', undefined, 'action_items');

      const callArgs = (mockLLMRouter.generate as any).mock.calls[0][1];
      const systemMsg = callArgs.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('行动项');
      expect(result).toContain('✅ 文档已创建！');
    });

    it('TC-6.3-004: should return error when conversation is empty', async () => {
      mockSessionManager.getConversation = vi.fn().mockReturnValue([]);

      const result = await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123');

      expect(result).toBe('❌ 对话内容为空');
      expect(mockToolAuthManager.callToolIfAllowed).not.toHaveBeenCalled();
    });

    it('TC-6.3-005: should return error when permission is disabled', async () => {
      mockToolAuthManager.isToolEnabled = vi.fn(() => false);

      const result = await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123');

      expect(result).toBe('❌ 文档创建功能已被禁用');
      expect(mockSessionManager.getSessionByThreadId).not.toHaveBeenCalled();
    });

    it('should return error when session does not exist', async () => {
      mockSessionManager.getSessionByThreadId = vi.fn().mockReturnValue(null);

      const result = await handler.execute('nonexistent', 'https://xxx.feishu.cn/folder/folder123');

      expect(result).toBe('❌ 会话不存在');
    });

    it('should return error when folder URL is invalid', async () => {
      const result = await handler.execute('thread123', 'https://invalid.com/doc/doc123');

      expect(result).toBe('❌ 无法解析文件夹链接');
    });

    it('should use custom title when provided', async () => {
      await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123', 'My Custom Title', 'summary');

      expect(mockToolAuthManager.callToolIfAllowed).toHaveBeenCalledWith('create_document', expect.objectContaining({
        title: 'My Custom Title',
      }));
    });

    it('should generate title from conversation when not provided', async () => {
      await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123', undefined, 'summary');

      expect(mockToolAuthManager.callToolIfAllowed).toHaveBeenCalledWith('create_document', expect.objectContaining({
        title: expect.stringContaining('对话归档:'),
      }));
    });

    it('should return error when document creation fails', async () => {
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123');

      expect(result).toBe('❌ 创建文档失败: API Error');
    });

    it('should handle missing documentId in response', async () => {
      mockToolAuthManager.callToolIfAllowed = vi.fn().mockResolvedValue({});

      const result = await handler.execute('thread123', 'https://xxx.feishu.cn/folder/folder123');

      expect(result).toContain('✅ 文档已创建！');
      expect(result).toContain('xxx.feishu.cn/docx/');
    });
  });
});