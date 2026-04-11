# Sprint 6: Tool Calling集成

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint周期**: 1周  
**前置依赖**: Sprint 3 模型路由, Sprint 4 MCP集成, Sprint 5 RAG Pipeline  
**Sprint目标**: 实现三大核心Tool与飞书联动  

---

## 1. 模块划分

### 模块 6.1: read_feishu_url Tool
### 模块 6.2: search_local_kb Tool
### 模块 6.3: save_to_new_doc Tool
### 模块 6.4: 工具注册与集成

---

## 2. 模块详细规格

### 模块 6.1: read_feishu_url Tool

**文件路径**: `src/tools/read_feishu_url.ts`

#### 2.1.1 Tool定义与实现

```typescript
import { MCPToolAuthManager } from '../core/mcp-tool-auth';
import { FeishuDocService } from '../services/feishu-doc';

const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '10000');

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

export class ReadFeishuUrlToolHandler {
  constructor(
    private toolAuthManager: MCPToolAuthManager,
    private docService: FeishuDocService
  ) {}

  getToolDefinition(): ReadFeishuUrlTool {
    return {
      name: 'read_feishu_url',
      description: '读取用户提供的飞书文档链接内容，转换为Markdown格式。适用于需要AI阅读并总结文档的场景。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '飞书文档或多维表格的完整URL',
          },
          purpose: {
            type: 'string',
            description: '用户要求AI对文档做什么（如"总结核心观点"、"提取关键数据"）',
          },
        },
        required: ['url'],
      },
    };
  }

  async execute(url: string, purpose?: string): Promise<string> {
    // 1. 权限检查
    if (!this.toolAuthManager.isToolEnabled('read_document')) {
      return '❌ 文档读取功能已被禁用';
    }

    // 2. 解析URL获取文档ID
    const documentId = this.parseDocumentId(url);
    if (!documentId) {
      return `❌ 无法解析文档链接: ${url}`;
    }

    // 3. 调用MCP或降级读取
    try {
      const content = await this.toolAuthManager.callToolIfAllowed('read_document', {
        document_id: documentId,
      });

      // 4. 转换为Markdown
      const markdown = this.convertToMarkdown(content);

      // 5. 截断超长内容
      const truncated = this.truncateIfNeeded(markdown);

      // 6. 构建结果
      let result = `【文档内容】\n\n${truncated}`;
      if (purpose) {
        result += `\n\n【任务】: ${purpose}`;
      }

      return result;
    } catch (error) {
      console.error('[read_feishu_url] Failed:', error);
      return `❌ 读取文档失败: ${(error as Error).message}`;
    }
  }

  private parseDocumentId(url: string): string | null {
    // https://xxx.feishu.cn/docx/xxxxx
    const match = url.match(/\/docx\/([a-zA-Z0-9]+)/);
    return match?.[1] || null;
  }

  private convertToMarkdown(content: any): string {
    // TODO: 实际实现内容转换
    if (typeof content === 'string') {
      return content;
    }
    return JSON.stringify(content, null, 2);
  }

  private truncateIfNeeded(text: string): string {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      return text;
    }
    return text.slice(0, MAX_MESSAGE_LENGTH) + 
      '\n\n[文档内容已截断，超出最大长度限制]';
  }
}
```

#### 2.1.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| URL解析 | 正确解析docx链接 | 单元测试 |
| 文档读取 | 返回文档内容 | mock测试 |
| 权限检查 | 未授权时返回错误 | 单元测试 |
| 内容截断 | 超长内容被截断 | 边界测试 |

#### 2.1.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-6.1-001 | 解析docx链接 | 返回documentId | 单元测试 |
| TC-6.1-002 | 解析无效链接 | 返回null | 边界测试 |
| TC-6.1-003 | 执行读取 | 返回内容 | mock测试 |
| TC-6.1-004 | 权限禁用 | 返回错误提示 | 单元测试 |
| TC-6.1-005 | 超长内容 | 内容被截断 | 边界测试 |

---

### 模块 6.2: search_local_kb Tool

**文件路径**: `src/tools/search_local_kb.ts`

#### 2.2.1 Tool定义与实现

```typescript
import { RAGPipeline } from '../services/rag-pipeline';
import { MCPToolAuthManager } from '../core/mcp-tool-auth';

const MAX_RETRIEVAL_CHUNKS = parseInt(process.env.MAX_RETRIEVAL_CHUNKS || '5');

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

export class SearchLocalKbToolHandler {
  constructor(
    private ragPipeline: RAGPipeline,
    private toolAuthManager: MCPToolAuthManager
  ) {}

  getToolDefinition(): SearchLocalKbTool {
    return {
      name: 'search_local_kb',
      description: '在本地知识库中检索与问题相关的文档片段。适用于询问历史沉淀知识、项目背景、决策记录等场景。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '用户的检索query',
          },
          top_k: {
            type: 'number',
            description: '返回最相关的chunk数量',
            default: 5,
          },
          filter_folder: {
            type: 'string',
            description: '可选，限定在特定文件夹中检索',
          },
        },
        required: ['query'],
      },
    };
  }

  async execute(
    query: string,
    topK: number = MAX_RETRIEVAL_CHUNKS,
    filterFolder?: string
  ): Promise<string> {
    // 1. 权限检查
    if (!this.toolAuthManager.isToolEnabled('search_wiki_or_drive')) {
      return '❌ 知识库检索功能已被禁用';
    }

    try {
      // 2. 限制topK
      const actualTopK = Math.min(topK, MAX_RETRIEVAL_CHUNKS);

      // 3. 执行检索
      let results: string;
      
      if (filterFolder) {
        // TODO: 实现文件夹过滤检索
        results = await this.ragPipeline.retrieve(query, actualTopK);
      } else {
        results = await this.ragPipeline.retrieve(query, actualTopK);
      }

      if (!results) {
        return '📚 知识库中未找到相关内容。';
      }

      return `【知识库检索结果】\n\n${results}`;
    } catch (error) {
      console.error('[search_local_kb] Failed:', error);
      return `❌ 检索失败: ${(error as Error).message}`;
    }
  }
}
```

#### 2.2.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 知识检索 | 返回相关文档片段 | 集成测试 |
| topK限制 | 返回不超过配置的chunk数 | 单元测试 |
| 空结果 | 返回友好提示 | 边界测试 |
| 权限检查 | 未授权时返回错误 | 单元测试 |

#### 2.2.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-6.2-001 | 正常检索 | 返回相关片段 | 集成测试 |
| TC-6.2-002 | 空结果 | 返回友好提示 | 边界测试 |
| TC-6.2-003 | topK=10 | 最多返回5个 | 单元测试 |
| TC-6.2-004 | 权限禁用 | 返回错误提示 | 单元测试 |

---

### 模块 6.3: save_to_new_doc Tool

**文件路径**: `src/tools/save_to_new_doc.ts`

#### 2.3.1 Tool定义与实现

```typescript
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

export class SaveToNewDocToolHandler {
  constructor(
    private sessionManager: SessionManager,
    private llmRouter: LLMRouter,
    private toolAuthManager: MCPToolAuthManager
  ) {}

  getToolDefinition(): SaveToNewDocTool {
    return {
      name: 'save_to_new_doc',
      description: '将当前对话内容整理成结构化文档并保存到飞书。仅创建新文档，绝不修改已有文档。',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '文档标题（可选，不提供则AI自动生成）',
          },
          save_folder_url: {
            type: 'string',
            description: '保存到的飞书文件夹URL',
          },
          summary_mode: {
            type: 'string',
            enum: ['full', 'summary', 'action_items'],
            description: '保存模式：完整记录 / 摘要总结 / 行动项',
            default: 'summary',
          },
        },
        required: ['save_folder_url'],
      },
    };
  }

  async execute(
    threadId: string,
    saveFolderUrl: string,
    title?: string,
    summaryMode: 'full' | 'summary' | 'action_items' = 'summary'
  ): Promise<string> {
    // 1. 权限检查
    if (!this.toolAuthManager.isToolEnabled('create_document')) {
      return '❌ 文档创建功能已被禁用';
    }

    try {
      // 2. 获取对话记录
      const session = this.sessionManager.getSessionByThreadId(threadId);
      if (!session) {
        return '❌ 会话不存在';
      }

      const messageLimit = session.messageLimit || 20;
      const conversation = this.sessionManager.getConversation(session.id, messageLimit);

      if (conversation.length === 0) {
        return '❌ 对话内容为空';
      }

      // 3. 生成文档内容
      const organizedContent = await this.organizeConversation(conversation, summaryMode);

      // 4. 解析文件夹token
      const folderToken = this.parseFolderToken(saveFolderUrl);
      if (!folderToken) {
        return '❌ 无法解析文件夹链接';
      }

      // 5. 创建文档
      const doc = await this.toolAuthManager.callToolIfAllowed('create_document', {
        parent_token: folderToken,
        title: title || this.generateTitle(conversation),
        content: organizedContent,
      });

      // 6. 返回结果
      const docUrl = doc?.url || `https://xxx.feishu.cn/docx/${doc?.documentId}`;
      return `✅ 文档已创建！\n\n📄 [点击查看文档](${docUrl})`;
    } catch (error) {
      console.error('[save_to_new_doc] Failed:', error);
      return `❌ 创建文档失败: ${(error as Error).message}`;
    }
  }

  private async organizeConversation(
    conversation: any[],
    mode: 'full' | 'summary' | 'action_items'
  ): Promise<string> {
    const systemPrompt = this.getOrganizePrompt(mode);
    
    const result = await this.llmRouter.generate(
      'gpt-4o',  // 使用较强的模型生成
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(conversation) }
      ]
    );

    return result;
  }

  private getOrganizePrompt(mode: 'full' | 'summary' | 'action_items'): string {
    switch (mode) {
      case 'full':
        return '请将以下对话内容整理成格式良好的Markdown文档，保持对话的完整性和结构。';
      case 'summary':
        return '请将以下对话内容整理成摘要Markdown文档，提取关键信息、结论和要点。';
      case 'action_items':
        return '请将以下对话内容整理成行动项清单，提取需要执行的任务、负责人和时间节点。';
    }
  }

  private generateTitle(conversation: any[]): string {
    const firstUserMessage = conversation.find(m => m.role === 'user');
    if (!firstUserMessage) {
      return 'AI对话归档';
    }
    
    const title = firstUserMessage.content.slice(0, 50);
    return `对话归档: ${title}${title.length >= 50 ? '...' : ''}`;
  }

  private parseFolderToken(url: string): string | null {
    const match = url.match(/\/folder\/([a-zA-Z0-9]+)/);
    return match?.[1] || null;
  }
}
```

#### 2.3.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 归档触发 | 能提取对话内容 | mock测试 |
| 三种模式 | full/summary/action_items正确处理 | 单元测试 |
| 文档创建 | 调用create_document成功 | mock测试 |
| 权限检查 | 未授权时返回错误 | 单元测试 |

#### 2.3.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-6.3-001 | 完整归档 | 保持对话完整性 | mock测试 |
| TC-6.3-002 | 摘要归档 | 提取关键信息 | mock测试 |
| TC-6.3-003 | 行动项归档 | 提取任务清单 | mock测试 |
| TC-6.3-004 | 空对话 | 返回错误提示 | 边界测试 |
| TC-6.3-005 | 权限禁用 | 返回错误提示 | 单元测试 |

---

### 模块 6.4: 工具注册与集成

**文件路径**: `src/tools/index.ts`

#### 2.4.1 工具注册器

```typescript
import { ReadFeishuUrlToolHandler } from './read_feishu_url';
import { SearchLocalKbToolHandler } from './search_local_kb';
import { SaveToNewDocToolHandler } from './save_to_new_doc';

export interface AITool {
  name: string;
  description: string;
  parameters: any;
  handler: (args: any) => Promise<string>;
}

export class ToolRegistry {
  private tools: Map<string, AITool> = new Map();

  constructor(
    readTool: ReadFeishuUrlToolHandler,
    searchTool: SearchLocalKbToolHandler,
    saveTool: SaveToNewDocToolHandler
  ) {
    // 注册工具
    this.registerTool(readTool);
    this.registerTool(searchTool);
    this.registerTool(saveTool);
  }

  private registerTool(handler: {
    getToolDefinition(): { name: string; description: string; parameters: any };
    execute(...args: any[]): Promise<string>;
  }): void {
    const definition = handler.getToolDefinition();
    this.tools.set(definition.name, {
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters,
      handler: handler.execute.bind(handler),
    });
  }

  getTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  // Vercel AI SDK兼容格式
  toVercelTools() {
    const tools: any[] = [];
    
    for (const tool of this.tools.values()) {
      tools.push({
        description: tool.description,
        parameters: tool.parameters,
      });
    }

    return tools;
  }
}
```

#### 2.4.2 工具调用集成到LLM

```typescript
// 在LLMRouter中添加工具调用支持
export class LLMRouter {
  private tools: Map<string, AITool> = new Map();

  setToolRegistry(registry: ToolRegistry): void {
    for (const tool of registry.getTools()) {
      this.tools.set(tool.name, tool);
    }
  }

  // 执行工具调用
  async executeTool(toolName: string, args: any): Promise<string> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    return await tool.handler(args);
  }
}
```

#### 2.4.3 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 工具注册 | 三个工具都注册成功 | 单元测试 |
| 工具列表 | Vercel SDK格式正确 | 单元测试 |
| 工具执行 | 能正确调用工具 | mock测试 |

#### 2.4.4 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-6.4-001 | 获取工具列表 | 返回3个工具 | 单元测试 |
| TC-6.4-002 | Vercel格式 | 格式正确 | 单元测试 |
| TC-6.4-003 | 执行read工具 | 调用成功 | mock测试 |

---

## 3. 开发流程

### Phase 1: 模块实现

每个模块完成后进行 **Commit 1**:

```bash
git add .
git commit -m "Sprint 6: 完成 [模块名称] 模块

- 实现功能点A
- 实现功能点B

Co-Authored-By: AI <ai@example.com>"
```

### Phase 2: 单元测试 + Bug修复

完成单元测试，发现并修复问题，然后进行 **Commit 2**:

```bash
git add .
git commit -m "Sprint 6: [模块名称] 单元测试与Bug修复

- 添加单元测试X个
- 修复问题Y

Co-Authored-By: AI <ai@example.com>"
```

### Phase 3: 编写模块文档

编写该模块的README或JSDoc，完成后进行 **Commit 3**:

```bash
git add .
git commit -m "Sprint 6: [模块名称] 文档完善

- 添加API文档
- 添加使用示例

Co-Authored-By: AI <ai@example.com>"
```

---

## 4. Sprint 6 完成标准

### 模块验收清单

| 模块 | 验收状态 | 完成标准 |
|-----|---------|---------|
| 6.1 read_feishu_url | [ ] | 读取文档正确 |
| 6.2 search_local_kb | [ ] | 检索返回结果 |
| 6.3 save_to_new_doc | [ ] | 创建文档成功 |
| 6.4 工具注册 | [ ] | 工具正确注册 |

### Sprint交付物

- read_feishu_url Tool
- search_local_kb Tool
- save_to_new_doc Tool
- 工具注册器

### Sprint验证

```bash
# 端到端测试流程:

# 1. 发送文档链接，AI自动读取
用户: "总结这个文档 https://xxx.feishu.cn/docx/xxx"
AI: 读取并总结

# 2. 发送知识库问题，AI触发检索
用户: "我们上个月的目标是什么"
AI: 触发知识库检索并回答

# 3. 发送归档指令，AI创建文档
用户: "/save"
AI: 整理对话并创建新文档
```

---

## 5. Sprint间依赖

**依赖Sprint 6的模块**: Sprint 7 (Admin控制台), Sprint 8 (集成测试)  
**被Sprint 6依赖**: Sprint 3, Sprint 4, Sprint 5

---

**文档版本**: v1.0  
**制定日期**: 2026-04-11  
**依据文档**: ai_feishu-PRD-正式版 v1.1
