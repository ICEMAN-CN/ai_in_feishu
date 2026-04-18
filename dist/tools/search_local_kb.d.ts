import { RAGPipeline } from '../services/rag-pipeline';
import { MCPToolAuthManager } from '../core/mcp-tool-auth';
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
export declare class SearchLocalKbToolHandler {
    private ragPipeline;
    private toolAuthManager;
    constructor(ragPipeline: RAGPipeline, toolAuthManager: MCPToolAuthManager);
    getToolDefinition(): SearchLocalKbTool;
    execute(query: string, topK?: number, filterFolder?: string): Promise<string>;
}
export {};
//# sourceMappingURL=search_local_kb.d.ts.map