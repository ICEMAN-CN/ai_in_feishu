import { EventEmitter } from 'events';
import { logger } from './logger';

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

export class MCPClient extends EventEmitter {
  constructor(config: MCPClientConfig) {
    super();
    this.config = { ...config };
    this.state = { connected: false, reconnectAttempts: 0 };
  }

  private config: MCPClientConfig;
  private state: MCPConnectionState;
  private tools: Map<string, MCPTool> = new Map();
  private singleton: MCPClient | null = null;
  private abortController: AbortController | null = null;
  private sseStreamController: AbortController | null = null;
  
  getConfig(): MCPClientConfig {
    return { ...this.config };
  }
  
  getConnectionState(): MCPConnectionState {
    return { ...this.state };
  }
  
  async connect(): Promise<void> {
    const maxAttempts = this.config.retryAttempts || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        logger.info('MCPClient', `Connecting to MCP server (attempt ${attempt + 1}/${maxAttempts + 1})`);

        // Abort any previous pending requests
        this.abortController?.abort();
        this.abortController = new AbortController();

        // HTTP POST initialize handshake
        const initResponse = await fetch(this.config.serverUrl + '/rpc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.serverToken && { 'Authorization': `Bearer ${this.config.serverToken}` }),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '1.0',
              capabilities: { tools: {} },
              clientInfo: { name: 'ai-feishu', version: '1.0.0' },
            },
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!initResponse.ok) {
          throw new Error(`HTTP ${initResponse.status}: ${initResponse.statusText}`);
        }

        // Start SSE stream for notifications
        await this.startSSEStream();

        this.state.connected = true;
        this.state.reconnectAttempts = 0;
        this.state.lastConnectedAt = new Date().toISOString();
        logger.info('MCPClient', 'Connected to MCP server successfully');
        this.emit('connected');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('MCPClient', `Connection attempt ${attempt + 1} failed: ${lastError.message}`);

        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          this.state.reconnectAttempts = attempt + 1;
          logger.info('MCPClient', `Reconnecting in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
          this.emit('reconnecting', { attempt: attempt + 1, delay });
          await this.sleep(delay);
        }
      }
    }

    logger.error('MCPClient', `Failed to connect after ${maxAttempts + 1} attempts: ${lastError?.message}`);
    this.emit('connection_failed', { error: lastError });
    throw lastError;
  }

  private async startSSEStream(): Promise<void> {
    // Close any existing SSE stream
    this.sseStreamController?.abort();
    this.sseStreamController = new AbortController();

    const response = await fetch(this.config.serverUrl + '/sse', {
      headers: {
        'Accept': 'text/event-stream',
        ...(this.config.serverToken && { 'Authorization': `Bearer ${this.config.serverToken}` }),
      },
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`SSE stream HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('SSE stream response has no body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    logger.info('MCPClient', 'SSE stream started');

    // Run stream reading in background
    this.readSSestream(reader, decoder, buffer);
  }

  private async readSSestream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder,
    initialBuffer: string
  ): Promise<void> {
    let buffer = initialBuffer;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          logger.info('MCPClient', 'SSE stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                logger.debug('MCPClient', `SSE event received: ${JSON.stringify(data)}`);
                this.emit('tool_result', data);
              } catch (parseError) {
                logger.warn('MCPClient', `Failed to parse SSE data: ${parseError}`);
              }
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.info('MCPClient', 'SSE stream aborted');
      } else {
        logger.error('MCPClient', `SSE stream error: ${error}`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  disconnect(): void {
    // Abort any pending requests
    this.abortController?.abort();
    this.abortController = null;

    // Close SSE stream
    this.sseStreamController?.abort();
    this.sseStreamController = null;

    this.state.connected = false;
    logger.info('MCPClient', 'Disconnected from MCP server');
    this.emit('disconnected');
  }
  
  isConnected(): boolean {
    return this.state.connected;
  }
  
  async loadTools(): Promise<void> {
    try {
      logger.info('MCPClient', 'Loading tools from MCP server...');

      const response = await fetch(this.config.serverUrl + '/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.serverToken && { 'Authorization': `Bearer ${this.config.serverToken}` }),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: MCPResponse = await response.json();

      if (data.error) {
        throw new Error(`MCP error: ${data.error.message}`);
      }

      const result = data.result as { tools?: MCPTool[] };
      const tools = result?.tools || [];

      for (const tool of tools) {
        this.tools.set(tool.name, tool);
      }

      logger.info('MCPClient', `Loaded ${tools.length} tools from MCP server`);
      this.emit('tools_loaded', { count: tools.length });
    } catch (error) {
      logger.warn('MCPClient', `Failed to load tools from server, using mock tools: ${error instanceof Error ? error.message : String(error)}`);

      const mockTools: MCPTool[] = [
        {
          name: 'read_document',
          description: '读取飞书文档内容',
          inputSchema: {
            type: 'object',
            properties: {
              document_id: { type: 'string', description: '文档ID' },
            },
            required: ['document_id'],
          },
          fallbackMethod: 'feishu.docx.document.get',
        },
        {
          name: 'create_document',
          description: '创建飞书文档',
          inputSchema: {
            type: 'object',
            properties: {
              parent_token: { type: 'string', description: '父文件夹token' },
              title: { type: 'string', description: '文档标题' },
              content: { type: 'string', description: '文档内容(Markdown)' },
            },
            required: ['parent_token', 'title', 'content'],
          },
          fallbackMethod: 'feishu.docx.document.create',
        },
        {
          name: 'search_wiki_or_drive',
          description: '在飞书知识库中搜索',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: '搜索关键词' },
              count: { type: 'number', description: '返回数量', default: 5 },
            },
            required: ['query'],
          },
          fallbackMethod: 'feishu.search',
        },
      ];

      for (const tool of mockTools) {
        this.tools.set(tool.name, tool);
      }

      logger.info('MCPClient', `Loaded ${mockTools.length} mock tools`);
      this.emit('tools_loaded', { count: mockTools.length });
    }
  }
  
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }
  
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }
  
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
  
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // Validate tool exists
    if (!this.tools.has(name)) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate connected
    if (!this.state.connected) {
      throw new Error('MCP client is not connected');
    }

    const response = await fetch(this.config.serverUrl + '/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.serverToken && { 'Authorization': `Bearer ${this.config.serverToken}` }),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.generateId(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: MCPResponse = await response.json();

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }

    const result = data.result as { data?: unknown };
    if (!result?.data) {
      throw new Error('No result data returned from tool call');
    }

    return result.data;
  }
  
  async callWithFallback(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const result = await this.callTool(name, args);
      return { success: true, data: result };
    } catch (error) {
      logger.warn('MCPClient', `Tool ${name} failed, using fallback`);

      const tool = this.tools.get(name);
      if (!tool?.fallbackMethod) {
        return { success: false, error: String(error) };
      }

      return {
        success: false,
        error: `Fallback ${tool.fallbackMethod} not implemented: ${error}`,
      };
    }
  }
}

export type { MCPClient as MCPClientInstance };

let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient | null {
  return mcpClientInstance;
}

export function initMCPClient(config: MCPClientConfig): MCPClient {
  if (mcpClientInstance) {
    mcpClientInstance.disconnect();
  }
  mcpClientInstance = new MCPClient(config);
  return mcpClientInstance;
}

export function destroyMCPClient(): void {
  if (mcpClientInstance) {
    mcpClientInstance.disconnect();
    mcpClientInstance = null;
  }
}
