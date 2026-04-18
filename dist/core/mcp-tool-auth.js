import { logger } from './logger';
const DEFAULT_TOOLS = [
    { toolName: 'read_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.get' },
    { toolName: 'create_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.create' },
    { toolName: 'search_wiki_or_drive', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.search' },
    { toolName: 'update_document', enabled: false, fallbackEnabled: false },
    { toolName: 'send_message', enabled: false, fallbackEnabled: false },
    { toolName: 'create_chat', enabled: false, fallbackEnabled: false },
];
export class MCPToolAuthManager {
    db;
    mcpClient;
    constructor(db, mcpClient) {
        this.db = db;
        this.mcpClient = mcpClient;
        this.initDefaultTools();
    }
    initDefaultTools() {
        for (const tool of DEFAULT_TOOLS) {
            const existing = this.db
                .prepare('SELECT tool_name FROM mcp_tool_auth WHERE tool_name = ?')
                .get(tool.toolName);
            if (!existing) {
                try {
                    this.db
                        .prepare('INSERT OR IGNORE INTO mcp_tool_auth (tool_name, enabled, fallback_enabled, fallback_method, updated_at) VALUES (?, ?, ?, ?, ?)')
                        .run(tool.toolName, tool.enabled ? 1 : 0, tool.fallbackEnabled ? 1 : 0, tool.fallbackMethod ?? null, new Date().toISOString());
                }
                catch {
                    this.db
                        .prepare('INSERT OR IGNORE INTO mcp_tool_auth (tool_name, enabled, fallback_enabled, fallback_method) VALUES (?, ?, ?, ?)')
                        .run(tool.toolName, tool.enabled ? 1 : 0, tool.fallbackEnabled ? 1 : 0, tool.fallbackMethod ?? null);
                }
            }
        }
        logger.info('MCPToolAuthManager', 'Default tools initialized');
    }
    isToolEnabled(toolName) {
        const row = this.db
            .prepare('SELECT enabled FROM mcp_tool_auth WHERE tool_name = ?')
            .get(toolName);
        if (!row)
            return false;
        return row.enabled === 1;
    }
    getToolAuth(toolName) {
        const row = this.db
            .prepare('SELECT * FROM mcp_tool_auth WHERE tool_name = ?')
            .get(toolName);
        if (!row)
            return null;
        return {
            toolName: row.tool_name,
            enabled: row.enabled === 1,
            fallbackEnabled: row.fallback_enabled === 1,
            fallbackMethod: row.fallback_method ?? undefined,
        };
    }
    getAllToolAuths() {
        const rows = this.db.prepare('SELECT * FROM mcp_tool_auth').all();
        return rows.map((row) => ({
            toolName: row.tool_name,
            enabled: row.enabled === 1,
            fallbackEnabled: row.fallback_enabled === 1,
            fallbackMethod: row.fallback_method ?? undefined,
        }));
    }
    setToolEnabled(toolName, enabled) {
        try {
            this.db
                .prepare('UPDATE mcp_tool_auth SET enabled = ?, updated_at = ? WHERE tool_name = ?')
                .run(enabled ? 1 : 0, new Date().toISOString(), toolName);
        }
        catch {
            this.db
                .prepare('UPDATE mcp_tool_auth SET enabled = ? WHERE tool_name = ?')
                .run(enabled ? 1 : 0, toolName);
        }
        logger.info('MCPToolAuthManager', `Tool ${toolName} ${enabled ? 'enabled' : 'disabled'}`);
    }
    async callToolIfAllowed(toolName, args) {
        if (!this.isToolEnabled(toolName)) {
            throw new Error(`Tool ${toolName} is disabled`);
        }
        if (this.mcpClient && this.mcpClient.isConnected()) {
            try {
                const result = await this.mcpClient.callTool(toolName, args);
                logger.info('MCPToolAuthManager', `Tool ${toolName} called successfully`);
                return result;
            }
            catch (error) {
                const auth = this.getToolAuth(toolName);
                if (auth?.fallbackEnabled) {
                    logger.warn('MCPToolAuthManager', `Tool ${toolName} failed, trying fallback: ${error instanceof Error ? error.message : String(error)}`);
                    return await this.mcpClient.callWithFallback(toolName, args);
                }
                throw error;
            }
        }
        throw new Error(`MCP client is not connected and no fallback available for tool ${toolName}`);
    }
}
//# sourceMappingURL=mcp-tool-auth.js.map