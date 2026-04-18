import { MCPToolAuthManager } from '../core/mcp-tool-auth';
import { FeishuDocService } from '../services/feishu-doc';
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
export declare class ReadFeishuUrlToolHandler {
    private toolAuthManager;
    private _docService;
    constructor(toolAuthManager: MCPToolAuthManager, _docService: FeishuDocService);
    getToolDefinition(): ReadFeishuUrlTool;
    execute(url: string, purpose?: string): Promise<string>;
    private parseDocumentId;
    private convertToMarkdown;
    private extractTextFromBlock;
    private truncateIfNeeded;
}
export {};
//# sourceMappingURL=read_feishu_url.d.ts.map