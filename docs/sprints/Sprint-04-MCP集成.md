# Sprint 4: MCP集成

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint周期**: 1周  
**前置依赖**: Sprint 1 基础设施, Sprint 2 飞书消息通道  
**Sprint目标**: 对接飞书官方MCP Server，实现工具透传  

---

## 1. 模块划分

### 模块 4.1: MCP Client模块
### 模块 4.2: MCP工具授权管理
### 模块 4.3: MCP降级策略
### 模块 4.4: Admin MCP配置API

---

## 2. 模块详细规格

### 模块 4.1: MCP Client模块

**文件路径**: `src/core/mcp-client.ts`

#### 2.1.1 MCP Client实现

```typescript
import { EventEmitter } from 'events';

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
    properties: Record<string, any>;
    required?: string[];
  };
  fallbackMethod?: string;
}

export class MCPClient extends EventEmitter {
  private connected: boolean = false;
  private config: MCPClientConfig;
  private tools: Map<string, MCPTool> = new Map();
  private reconnectAttempts: number = 0;

  constructor(config: MCPClientConfig) {
    super();
    this.config = {
      serverUrl: config.serverUrl,
      serverToken: config.serverToken,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
    };
  }

  async connect(): Promise<void> {
    try {
      // 连接到MCP Server
      // TODO: 实现实际的MCP连接逻辑
      // 这里先实现模拟连接
      console.log(`[MCP] Connecting to ${this.config.serverUrl}...`);
      
      // 模拟连接成功
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      console.log('[MCP] Connected successfully');
      
      // 加载可用工具
      await this.loadTools();
    } catch (error) {
      console.error('[MCP] Connection failed:', error);
      this.connected = false;
      throw error;
    }
  }

  disconnect(): void {
    this.connected = false;
    this.emit('disconnected');
    console.log('[MCP] Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async loadTools(): Promise<void> {
    // TODO: 从MCP Server获取可用工具列表
    // 模拟获取到的工具
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
    
    console.log(`[MCP] Loaded ${this.tools.size} tools`);
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

  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.connected) {
      throw new Error('MCP client not connected');
    }

    if (!this.hasTool(toolName)) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      // TODO: 实现实际的MCP工具调用
      // 这里先实现模拟调用
      console.log(`[MCP] Calling tool: ${toolName}`, args);
      
      // 模拟返回
      return { success: true, data: {} };
    } catch (error) {
      console.error(`[MCP] Tool call failed: ${toolName}`, error);
      throw error;
    }
  }

  // 降级处理
  async callWithFallback(
    toolName: string, 
    args: Record<string, any>,
    fallbackMethod: string
  ): Promise<any> {
    try {
      if (this.isConnected()) {
        return await this.callTool(toolName, args);
      }
    } catch (error) {
      console.warn(`[MCP] Tool ${toolName} failed, using fallback: ${fallbackMethod}`, error);
    }
    
    // 调用降级方法
    return this.callFallbackMethod(fallbackMethod, args);
  }

  private async callFallbackMethod(method: string, args: Record<string, any>): Promise<any> {
    console.log(`[MCP Fallback] Calling: ${method}`, args);
    // TODO: 实现实际的降级API调用
    // 这里返回模拟数据
    return { success: true, fallback: true, data: {} };
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      // TODO: 实现实际的健康检查
      return this.connected;
    } catch {
      return false;
    }
  }
}

// MCP Client管理器（单例）
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
```

#### 2.1.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 连接建立 | 成功连接到MCP Server | 日志验证 |
| 连接状态 | isConnected()返回正确状态 | 单元测试 |
| 工具加载 | 加载read_document等工具 | 日志验证 |
| 工具调用 | callTool能调用成功 | mock测试 |
| 断开连接 | disconnect后状态正确 | 单元测试 |

#### 2.1.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-4.1-001 | 连接到MCP Server | connected=true | 单元测试 |
| TC-4.1-002 | 获取工具列表 | 返回工具数组 | 单元测试 |
| TC-4.1-003 | 获取单个工具 | 返回工具详情 | 单元测试 |
| TC-4.1-004 | 调用工具 | 返回调用结果 | mock测试 |
| TC-4.1-005 | 断开连接 | connected=false | 单元测试 |

---

### 模块 4.2: MCP工具授权管理

**文件路径**: `src/core/mcp-tool-auth.ts`

#### 2.2.1 工具授权管理

```typescript
import { Database } from 'better-sqlite3';
import { MCPClient, MCPTool } from './mcp-client';

export interface ToolAuthConfig {
  toolName: string;
  enabled: boolean;
  fallbackEnabled: boolean;
  fallbackMethod?: string;
}

export class MCPToolAuthManager {
  constructor(
    private db: Database,
    private mcpClient: MCPClient
  ) {
    this.initDefaultTools();
  }

  private initDefaultTools(): void {
    const defaultTools: ToolAuthConfig[] = [
      { toolName: 'read_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.get' },
      { toolName: 'create_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.create' },
      { toolName: 'search_wiki_or_drive', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.search' },
      { toolName: 'update_document', enabled: false, fallbackEnabled: false },
      { toolName: 'send_message', enabled: false, fallbackEnabled: false },
      { toolName: 'create_chat', enabled: false, fallbackEnabled: false },
    ];

    for (const tool of defaultTools) {
      const existing = this.db.prepare(
        'SELECT * FROM mcp_tool_auth WHERE tool_name = ?'
      ).get(tool.toolName);

      if (!existing) {
        this.db.prepare(`
          INSERT INTO mcp_tool_auth (tool_name, enabled, fallback_enabled, fallback_method, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          tool.toolName,
          tool.enabled ? 1 : 0,
          tool.fallbackEnabled ? 1 : 0,
          tool.fallbackMethod || null,
          new Date().toISOString()
        );
      }
    }
  }

  isToolEnabled(toolName: string): boolean {
    const row = this.db.prepare(
      'SELECT enabled FROM mcp_tool_auth WHERE tool_name = ?'
    ).get(toolName) as { enabled: number } | undefined;

    return row?.enabled === 1;
  }

  getToolAuth(toolName: string): ToolAuthConfig | null {
    const row = this.db.prepare(
      'SELECT * FROM mcp_tool_auth WHERE tool_name = ?'
    ).get(toolName) as any;

    if (!row) return null;

    return {
      toolName: row.tool_name,
      enabled: row.enabled === 1,
      fallbackEnabled: row.fallback_enabled === 1,
      fallbackMethod: row.fallback_method,
    };
  }

  getAllToolAuths(): ToolAuthConfig[] {
    const rows = this.db.prepare(
      'SELECT * FROM mcp_tool_auth ORDER BY tool_name'
    ).all() as any[];

    return rows.map(row => ({
      toolName: row.tool_name,
      enabled: row.enabled === 1,
      fallbackEnabled: row.fallback_enabled === 1,
      fallbackMethod: row.fallback_method,
    }));
  }

  setToolEnabled(toolName: string, enabled: boolean): void {
    this.db.prepare(`
      UPDATE mcp_tool_auth 
      SET enabled = ?, updated_at = ?
      WHERE tool_name = ?
    `).run(enabled ? 1 : 0, new Date().toISOString(), toolName);
  }

  // 调用工具（带权限检查）
  async callToolIfAllowed(
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    if (!this.isToolEnabled(toolName)) {
      throw new Error(`Tool not allowed: ${toolName}`);
    }

    const auth = this.getToolAuth(toolName);
    if (!auth) {
      throw new Error(`Tool auth not configured: ${toolName}`);
    }

    // 优先使用MCP调用
    if (this.mcpClient.isConnected()) {
      try {
        return await this.mcpClient.callTool(toolName, args);
      } catch (error) {
        console.warn(`[MCP] Tool call failed: ${toolName}`, error);
        
        // 如果MCP调用失败且允许降级
        if (auth.fallbackEnabled && auth.fallbackMethod) {
          return this.mcpClient.callWithFallback(toolName, args, auth.fallbackMethod);
        }
        
        throw error;
      }
    }

    // MCP未连接，使用降级
    if (auth.fallbackEnabled && auth.fallbackMethod) {
      return this.mcpClient.callWithFallback(toolName, args, auth.fallbackMethod);
    }

    throw new Error(`MCP not connected and fallback not available for: ${toolName}`);
  }
}
```

#### 2.2.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 默认授权 | 默认工具授权状态正确 | 数据库检查 |
| 授权检查 | 未授权工具被拒绝 | 单元测试 |
| 授权更新 | setToolEnabled正确更新 | 单元测试 |
| 降级触发 | MCP失败时触发降级 | mock测试 |

#### 2.2.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-4.2-001 | 检查已授权工具 | 返回true | 单元测试 |
| TC-4.2-002 | 检查未授权工具 | 返回false | 单元测试 |
| TC-4.2-003 | 调用已授权工具 | 正常调用 | mock测试 |
| TC-4.2-004 | 调用未授权工具 | 抛出Error | 单元测试 |
| TC-4.2-005 | MCP失败后降级 | 调用降级方法 | mock测试 |

---

### 模块 4.3: MCP降级策略

**文件路径**: `src/services/mcp-fallback.ts`

#### 2.3.1 降级服务实现

```typescript
import { Client } from '@larksuiteoapi/node-sdk';

export interface FallbackConfig {
  enabled: boolean;
  useNativeAPI: boolean;
}

export class MCPFallbackService {
  private client: Client;
  private config: FallbackConfig;

  constructor(client: Client, config?: Partial<FallbackConfig>) {
    this.client = client;
    this.config = {
      enabled: config?.enabled ?? true,
      useNativeAPI: config?.useNativeAPI ?? true,
    };
  }

  // read_document 降级实现
  async readDocument(documentId: string): Promise<string> {
    try {
      const response = await this.client.docx.v1.document.get({
        path: { document_id: documentId },
      });
      
      // 提取文档内容并转换为Markdown
      const doc = response.data;
      return this.convertToMarkdown(doc);
    } catch (error) {
      console.error('[Fallback] readDocument failed:', error);
      throw error;
    }
  }

  // create_document 降级实现
  async createDocument(
    parentToken: string,
    title: string,
    content: string
  ): Promise<{ documentId: string; url: string }> {
    try {
      // 先创建文档
      const createResponse = await this.client.docx.v1.document.create({
        data: {
          parent_token: parentToken,
          title,
        },
      });

      const documentId = createResponse.data.document?.document_id;
      if (!documentId) {
        throw new Error('Failed to create document');
      }

      // 写入内容
      await this.client.docx.v1.document.rawContent.update({
        path: { document_id: documentId },
        data: {
          content: JSON.stringify(this.markdownToBlocks(content)),
        },
      });

      return {
        documentId,
        url: `https://xxx.feishu.cn/docx/${documentId}`,
      };
    } catch (error) {
      console.error('[Fallback] createDocument failed:', error);
      throw error;
    }
  }

  // search 降级实现
  async search(query: string, count: number = 5): Promise<any[]> {
    try {
      const response = await this.client.search.v1.message.search({
        data: {
          query,
          message_type: ['docx'],
          count,
        },
      });

      return response.data.items || [];
    } catch (error) {
      console.error('[Fallback] search failed:', error);
      throw error;
    }
  }

  // Markdown转飞书文档块
  private markdownToBlocks(markdown: string): any[] {
    // 简化实现，实际需要更复杂的解析
    return [
      {
        block_type: 2,  // 段落
        block_id: 'p1',
        text: {
          elements: [
            {
              text_run: {
                content: markdown,
              },
            },
          ],
        },
      },
    ];
  }

  // 转换为Markdown
  private convertToMarkdown(doc: any): string {
    // 简化实现
    if (!doc?.document?.content) {
      return '';
    }

    // TODO: 实际解析飞书文档块结构
    return JSON.stringify(doc.document.content, null, 2);
  }
}
```

#### 2.3.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 降级读取 | 原生API能读取文档 | 手动测试 |
| 降级创建 | 原生API能创建文档 | 手动测试 |
| 降级搜索 | 原生API能搜索文档 | 手动测试 |

#### 2.3.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-4.3-001 | 读取文档 | 返回文档内容 | mock测试 |
| TC-4.3-002 | 创建文档 | 返回文档ID和URL | mock测试 |

---

### 模块 4.4: Admin MCP配置API

**文件路径**: `src/routers/admin-mcp.ts`

#### 2.4.1 Admin MCP API

```typescript
import { Hono } from 'hono';
import { Database } from 'better-sqlite3';
import { MCPToolAuthManager } from '../core/mcp-tool-auth';
import { getMCPClient } from '../core/mcp-client';

const mcpAdmin = new Hono();

let db: Database;
let toolAuthManager: MCPToolAuthManager;

export function initMCPAdminRouter(database: Database, authManager: MCPToolAuthManager) {
  db = database;
  toolAuthManager = authManager;
}

// 获取MCP连接状态
mcpAdmin.get('/status', async (c) => {
  const mcpClient = getMCPClient();
  const connected = mcpClient?.isConnected() || false;
  const fallbackEnabled = process.env.MCP_FALLBACK_ENABLED === 'true';

  return c.json({
    connected,
    fallbackEnabled,
    serverUrl: process.env.MCP_SERVER_URL,
  });
});

// 获取所有工具授权状态
mcpAdmin.get('/tools', async (c) => {
  const tools = toolAuthManager.getAllToolAuths();
  const mcpClient = getMCPClient();
  const mcpTools = mcpClient?.getTools() || [];

  return c.json({
    tools: tools.map(tool => ({
      ...tool,
      availableInMCP: mcpTools.some(t => t.name === tool.toolName),
    })),
  });
});

// 更新工具授权
mcpAdmin.put('/tools/:name', async (c) => {
  const toolName = c.req.param('name');
  const body = await c.req.json();
  const { enabled } = body;

  if (typeof enabled !== 'boolean') {
    return c.json({ success: false, message: 'enabled must be boolean' }, 400);
  }

  try {
    toolAuthManager.setToolEnabled(toolName, enabled);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, message: (error as Error).message }, 400);
  }
});

// 健康检查
mcpAdmin.get('/health', async (c) => {
  const mcpClient = getMCPClient();
  const healthy = await mcpClient?.healthCheck() || false;

  return c.json({
    healthy,
    connected: mcpClient?.isConnected() || false,
    toolsLoaded: mcpClient?.getTools().length || 0,
  });
});

export default mcpAdmin;
```

#### 2.4.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| GET /mcp/status | 返回连接状态和降级配置 | curl测试 |
| GET /mcp/tools | 返回所有工具授权列表 | curl测试 |
| PUT /mcp/tools/:name | 更新授权状态 | curl测试 |
| GET /mcp/health | 返回健康状态 | curl测试 |

#### 2.4.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-4.4-001 | GET /mcp/status | 返回连接状态 | curl测试 |
| TC-4.4-002 | GET /mcp/tools | 返回工具列表 | curl测试 |
| TC-4.4-003 | PUT禁用工具 | 更新授权状态 | curl测试 |
| TC-4.4-004 | GET /mcp/health | 返回健康状态 | curl测试 |

---

## 3. 开发流程

### Phase 1: 模块实现

每个模块完成后进行 **Commit 1**:

```bash
git add .
git commit -m "Sprint 4: 完成 [模块名称] 模块

- 实现功能点A
- 实现功能点B

Co-Authored-By: AI <ai@example.com>"
```

### Phase 2: 单元测试 + Bug修复

完成单元测试，发现并修复问题，然后进行 **Commit 2**:

```bash
git add .
git commit -m "Sprint 4: [模块名称] 单元测试与Bug修复

- 添加单元测试X个
- 修复问题Y

Co-Authored-By: AI <ai@example.com>"
```

### Phase 3: 编写模块文档

编写该模块的README或JSDoc，完成后进行 **Commit 3**:

```bash
git add .
git commit -m "Sprint 4: [模块名称] 文档完善

- 添加API文档
- 添加使用示例

Co-Authored-By: AI <ai@example.com>"
```

---

## 4. Sprint 4 完成标准

### 模块验收清单

| 模块 | 验收状态 | 完成标准 |
|-----|---------|---------|
| 4.1 MCP Client模块 | [ ] | 连接成功，工具加载 |
| 4.2 工具授权管理 | [ ] | 授权检查正确 |
| 4.3 降级策略 | [ ] | MCP失败时自动降级 |
| 4.4 Admin MCP API | [ ] | API正常响应 |

### Sprint交付物

- MCP Client模块
- 工具授权管理器
- MCP降级服务
- Admin MCP配置API

### Sprint验证

```bash
# 1. 配置MCP Server地址
export MCP_SERVER_URL=http://localhost:3001

# 2. 启动服务
npm run dev

# 3. 检查MCP状态
curl http://localhost:3000/api/admin/mcp/status

# 4. 查看工具列表
curl http://localhost:3000/api/admin/mcp/tools

# 5. 禁用create_document工具
curl -X PUT http://localhost:3000/api/admin/mcp/tools/create_document \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

# 6. 验证健康检查
curl http://localhost:3000/api/admin/mcp/health
```

---

## 5. Sprint间依赖

**依赖Sprint 4的模块**: Sprint 5 (RAG Pipeline), Sprint 6 (Tool Calling)  
**被Sprint 4依赖**: Sprint 1, Sprint 2

---

**文档版本**: v1.0  
**制定日期**: 2026-04-11  
**依据文档**: ai_feishu-PRD-正式版 v1.1
