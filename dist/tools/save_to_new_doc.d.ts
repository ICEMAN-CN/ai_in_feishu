import { SessionManager } from '../core/session-manager';
import { LLMRouter } from '../services/llm-router';
import { MCPToolAuthManager } from '../core/mcp-tool-auth';
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
export declare class SaveToNewDocToolHandler {
    private sessionManager;
    private llmRouter;
    private toolAuthManager;
    constructor(sessionManager: SessionManager, llmRouter: LLMRouter, toolAuthManager: MCPToolAuthManager);
    getToolDefinition(): SaveToNewDocTool;
    execute(threadId: string, saveFolderUrl: string, title?: string, summaryMode?: 'full' | 'summary' | 'action_items'): Promise<string>;
    private organizeConversation;
    private getOrganizePrompt;
    private generateTitle;
    private parseFolderToken;
}
export {};
//# sourceMappingURL=save_to_new_doc.d.ts.map