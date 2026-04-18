import { EventEmitter } from 'events';
/**
 * MCP Client - 连接飞书官方MCP Server的客户端
 * 支持工具发现、工具调用、SSE流式响应
 */
export interface MCPClientConfig {
    serverUrl: string;
    serverToken?: string;
    timeout: number;
    retryAttempts: number;
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
    fallbackMethod?: string;
}
export interface MCPMessage {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: Record<string, unknown>;
}
export interface MCPResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export interface MCPConnectionState {
    connected: boolean;
    reconnectAttempts: number;
    lastConnectedAt?: string;
}
export type MCPToolResult = {
    success: boolean;
    data?: unknown;
    error?: string;
};
export declare class MCPClient extends EventEmitter {
    constructor(config: MCPClientConfig);
    private config;
    private state;
    private tools;
    private singleton;
    private abortController;
    private sseStreamController;
    getConfig(): MCPClientConfig;
    getConnectionState(): MCPConnectionState;
    connect(): Promise<void>;
    private startSSEStream;
    private readSSestream;
    private sleep;
    private generateId;
    disconnect(): void;
    isConnected(): boolean;
    healthCheck(): Promise<boolean>;
    loadTools(): Promise<void>;
    getTools(): MCPTool[];
    getTool(name: string): MCPTool | undefined;
    hasTool(name: string): boolean;
    callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
    callWithFallback(name: string, args: Record<string, unknown>): Promise<MCPToolResult>;
}
export type { MCPClient as MCPClientInstance };
export declare function getMCPClient(): MCPClient | null;
export declare function initMCPClient(config: MCPClientConfig): MCPClient;
export declare function destroyMCPClient(): void;
//# sourceMappingURL=mcp-client.d.ts.map