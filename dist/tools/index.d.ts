import { ReadFeishuUrlToolHandler } from './read_feishu_url';
import { SearchLocalKbToolHandler } from './search_local_kb';
import { SaveToNewDocToolHandler } from './save_to_new_doc';
export interface AITool {
    name: string;
    description: string;
    parameters: any;
    handler: (args: any) => Promise<string>;
}
export declare class ToolRegistry {
    private tools;
    constructor(readTool: ReadFeishuUrlToolHandler, searchTool: SearchLocalKbToolHandler, saveTool: SaveToNewDocToolHandler);
    private registerTool;
    getTools(): AITool[];
    getTool(name: string): AITool | undefined;
    getToolNames(): string[];
    toVercelTools(): any[];
}
export {};
//# sourceMappingURL=index.d.ts.map