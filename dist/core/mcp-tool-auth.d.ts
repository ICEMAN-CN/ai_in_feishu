import Database from 'better-sqlite3';
import { MCPClient } from './mcp-client';
export interface ToolAuthConfig {
    toolName: string;
    enabled: boolean;
    fallbackEnabled: boolean;
    fallbackMethod?: string;
}
export declare class MCPToolAuthManager {
    private db;
    private mcpClient?;
    constructor(db: Database.Database, mcpClient?: MCPClient | undefined);
    private initDefaultTools;
    isToolEnabled(toolName: string): boolean;
    getToolAuth(toolName: string): ToolAuthConfig | null;
    getAllToolAuths(): ToolAuthConfig[];
    setToolEnabled(toolName: string, enabled: boolean): void;
    callToolIfAllowed(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}
//# sourceMappingURL=mcp-tool-auth.d.ts.map