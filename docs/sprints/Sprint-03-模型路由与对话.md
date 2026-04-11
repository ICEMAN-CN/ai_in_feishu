# Sprint 3: 模型路由与对话

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint周期**: 1.5周  
**前置依赖**: Sprint 1 基础设施, Sprint 2 飞书消息通道  
**Sprint目标**: 完成多模型配置、流式输出、会话管理  

---

## 1. 模块划分

### 模块 3.1: Session会话管理
### 模块 3.2: LLM路由服务 (Vercel AI SDK)
### 模块 3.3: 流式响应处理
### 模块 3.4: 上下文管理
### 模块 3.5: Admin模型管理API

---

## 2. 模块详细规格

### 模块 3.1: Session会话管理

**文件路径**: `src/core/session-manager.ts`, `src/types/session.ts`

#### 2.1.1 Session类型定义 (src/types/session.ts)

```typescript
export interface Session {
  id: string;
  threadId: string;       // 飞书 root_id
  p2pId: string;         // 私聊会话ID
  modelId: string;        // 绑定的模型ID
  systemPrompt?: string;
  messageCount: number;
  messageLimit: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ConversationContext {
  session: Session;
  messages: Message[];
}
```

#### 2.1.2 Session管理器 (src/core/session-manager.ts)

```typescript
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const THREAD_MESSAGE_LIMIT = parseInt(process.env.THREAD_MESSAGE_LIMIT || '20');

export class SessionManager {
  constructor(private db: Database) {}

  // 创建或获取Session
  async createOrGetSession(
    p2pId: string,
    rootId?: string,
    parentId?: string,
    modelId?: string
  ): Promise<Session> {
    // 情况1: parentId为空或parentId=rootId = 新Thread的第一条消息
    if (!parentId || parentId === rootId) {
      const threadId = rootId || uuidv4();
      
      // 检查是否已存在（rootId可能已存在）
      const existing = this.getSessionByThreadId(threadId);
      if (existing) {
        return existing;
      }

      const session: Session = {
        id: uuidv4(),
        threadId,
        p2pId,
        modelId: modelId || this.getDefaultModelId() || '',
        systemPrompt: '',
        messageCount: 0,
        messageLimit: THREAD_MESSAGE_LIMIT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.saveSession(session);
      return session;
    }

    // 情况2: parentId不为空 = Thread已存在
    const existingSession = this.getSessionByThreadId(rootId!);
    if (!existingSession) {
      throw new Error(`Thread不存在: rootId=${rootId}, parentId=${parentId}`);
    }
    return existingSession;
  }

  getSessionByThreadId(threadId: string): Session | null {
    const row = this.db.prepare(`
      SELECT * FROM sessions WHERE thread_id = ?
    `).get(threadId) as any;

    if (!row) return null;

    return {
      id: row.id,
      threadId: row.thread_id,
      p2pId: row.p2p_id,
      modelId: row.model_id,
      systemPrompt: row.system_prompt,
      messageCount: row.message_count,
      messageLimit: row.message_limit,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
    };
  }

  saveSession(session: Session): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions 
      (id, thread_id, p2p_id, model_id, system_prompt, message_count, message_limit, created_at, updated_at, last_message_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.threadId,
      session.p2pId,
      session.modelId,
      session.systemPrompt || '',
      session.messageCount,
      session.messageLimit,
      session.createdAt,
      session.updatedAt,
      session.lastMessageAt || null
    );
  }

  updateSessionMessage(sessionId: string, increment: number = 1): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE sessions 
      SET message_count = message_count + ?, updated_at = ?, last_message_at = ?
      WHERE id = ?
    `).run(increment, now, now, sessionId);
  }

  private getDefaultModelId(): string | null {
    const row = this.db.prepare(`
      SELECT id FROM models WHERE is_default = 1 AND enabled = 1 LIMIT 1
    `).get() as { id: string } | undefined;
    return row?.id || null;
  }

  // 获取对话历史（自动截断）
  getConversation(sessionId: string, limit?: number): Message[] {
    // TODO: 从消息存储中获取，这里先返回空数组
    // 后续在消息存储模块中实现
    return [];
  }

  // 清理超长Session的历史消息
  truncateSessionMessages(sessionId: string): void {
    // 后续在消息存储中实现
  }
}
```

#### 2.1.3 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 新Session创建 | root_id为空时创建新Session | 单元测试 |
| 已存在Session获取 | root_id已存在时返回已有Session | 单元测试 |
| Thread绑定模型 | Session绑定正确模型ID | 单元测试 |
| Session持久化 | Session保存到SQLite | 集成测试 |

#### 2.1.4 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-3.1-001 | 创建新Session | 返回Session，threadId正确 | 单元测试 |
| TC-3.1-002 | 获取已存在Session | 返回相同Session | 单元测试 |
| TC-3.1-003 | parentId存在但Thread不存在 | 抛出Error | 边界测试 |
| TC-3.1-004 | 更新消息计数 | messageCount递增 | 单元测试 |

---

### 模块 3.2: LLM路由服务 (Vercel AI SDK)

**文件路径**: `src/services/llm-router.ts`

#### 2.2.1 LLM路由实现

```typescript
import { createAI, generateText, streamText, CoreMessage } from '@ai-sdk/sdk';
import { decryptFromStorage } from '../core/encryption';

interface ModelProviderConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

export class LLMRouter {
  private models: Map<string, any> = new Map();
  private defaultModelId: string | null = null;

  constructor(private db: any) {
    this.loadModels();
  }

  private loadModels(): void {
    const rows = this.db.prepare(`
      SELECT * FROM models WHERE enabled = 1
    `).all() as any[];

    for (const row of rows) {
      try {
        const apiKey = decryptFromStorage(row.api_key_encrypted);
        
        // 创建provider实例
        let provider: any;
        switch (row.provider) {
          case 'openai':
            const { openai } = require('@ai-sdk/openai');
            provider = openai({
              apiKey,
              baseURL: row.base_url,
            });
            break;
          
          case 'anthropic':
            const { anthropic } = require('@ai-sdk/anthropic');
            provider = anthropic({
              apiKey,
              baseURL: row.base_url,
            });
            break;
          
          case 'gemini':
            const { google } = require('@ai-sdk/google');
            provider = google({
              apiKey,
              baseURL: row.base_url,
            });
            break;
          
          case 'ollama':
            const { ollama } = require('@ai-sdk/ollama');
            provider = ollama({
              baseURL: row.base_url,
            });
            break;
        }

        if (provider) {
          const model = provider(row.model_id);
          this.models.set(row.id, model);
          
          if (row.is_default) {
            this.defaultModelId = row.id;
          }
        }
      } catch (error) {
        console.error(`Failed to load model ${row.name}:`, error);
      }
    }
  }

  getModel(modelId?: string): any {
    const id = modelId || this.defaultModelId;
    if (!id) {
      throw new Error('No model available');
    }
    const model = this.models.get(id);
    if (!model) {
      throw new Error(`Model not found: ${id}`);
    }
    return model;
  }

  getModelConfig(modelId: string): ModelProviderConfig | null {
    const row = this.db.prepare(`
      SELECT * FROM models WHERE id = ?
    `).get(modelId) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      apiKey: decryptFromStorage(row.api_key_encrypted),
      baseUrl: row.base_url,
      modelId: row.model_id,
    };
  }

  getModelName(modelId: string): string {
    const row = this.db.prepare(`
      SELECT name FROM models WHERE id = ?
    `).get(modelId) as { name: string } | undefined;
    return row?.name || 'Unknown';
  }

  // 生成文本（流式）
  async *streamGenerate(
    modelId: string,
    messages: CoreMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const model = this.getModel(modelId);
    const maxTokens = this.getModelConfig(modelId)?.maxTokens || 4096;

    const result = streamText({
      model,
      messages: systemPrompt 
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      maxTokens,
    });

    for await (const delta of result.fullStream) {
      if (delta.type === 'text-delta') {
        yield delta.textDelta;
      }
    }
  }

  // 生成文本（非流式）
  async generate(
    modelId: string,
    messages: CoreMessage[],
    systemPrompt?: string
  ): Promise<string> {
    const model = this.getModel(modelId);
    const maxTokens = this.getModelConfig(modelId)?.maxTokens || 4096;

    const result = generateText({
      model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      maxTokens,
    });

    return result.text;
  }
}
```

#### 2.2.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 模型加载 | 从SQLite加载已配置模型 | 日志验证 |
| 默认模型 | 能获取默认模型 | 单元测试 |
| 流式生成 | 返回AsyncGenerator | 单元测试 |
| 非流式生成 | 返回完整文本 | 单元测试 |

#### 2.2.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-3.2-001 | 加载OpenAI模型 | 模型实例创建成功 | mock测试 |
| TC-3.2-002 | 调用流式生成 | 返回AsyncGenerator | 单元测试 |
| TC-3.2-003 | 调用非流式生成 | 返回完整文本 | 单元测试 |
| TC-3.2-004 | 模型不存在 | 抛出Error | 边界测试 |

---

### 模块 3.3: 流式响应处理

**文件路径**: `src/services/streaming-handler.ts`

#### 2.3.1 流式响应处理器

```typescript
import { LLMRouter } from './llm-router';
import { SessionManager } from '../core/session-manager';
import { MessageService } from '../feishu/message-handler';
import { CardBuilder } from '../feishu/card-builder';

export class StreamingHandler {
  constructor(
    private llmRouter: LLMRouter,
    private sessionManager: SessionManager,
    private messageService: MessageService
  ) {}

  async handleUserMessage(
    chatId: string,
    sessionId: string,
    userMessage: string
  ): Promise<void> {
    const session = this.sessionManager.getSessionByThreadId(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const modelName = this.llmRouter.getModelName(session.modelId);

    // 1. 发送初始卡片
    const initialCard = CardBuilder.streamingCard(modelName, '正在思考...');
    const messageId = await this.messageService.sendCardMessage(chatId, initialCard);

    // 2. 构建消息历史
    const messages = [
      { role: 'user' as const, content: userMessage }
    ];

    // 3. 流式生成并更新卡片
    let fullResponse = '';
    const card = JSON.parse(JSON.stringify(initialCard));

    for await (const textDelta of this.llmRouter.streamGenerate(
      session.modelId,
      messages,
      session.systemPrompt
    )) {
      fullResponse += textDelta;

      // 更新卡片内容
      const contentElement = card.card.elements.find((e: any) => e.id === 'response_content');
      if (contentElement) {
        contentElement.text.content = fullResponse + '▌';  // 光标效果
      }

      // 高频更新（每200-500ms更新一次）
      await this.messageService.updateCardMessage(messageId, card);
    }

    // 4. 最终响应（移除光标）
    const finalCard = JSON.parse(JSON.stringify(initialCard));
    const finalContentElement = finalCard.card.elements.find((e: any) => e.id === 'response_content');
    if (finalContentElement) {
      finalContentElement.text.content = fullResponse;
    }

    // 移除"流式输出中..."提示
    finalCard.card.elements = finalCard.card.elements.filter((e: any) => e.id !== 'divider' && e.tag !== 'note');

    await this.messageService.updateCardMessage(messageId, finalCard);

    // 5. 更新Session消息计数
    this.sessionManager.updateSessionMessage(sessionId, 1);
  }
}
```

#### 2.3.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 流式输出 | 卡片内容逐步更新 | 手动测试 |
| Markdown渲染 | 代码块等格式正确渲染 | 手动测试 |
| 响应完整 | 最终响应无光标 | 视觉检查 |
| 消息计数 | Session消息计数正确更新 | 日志验证 |

#### 2.3.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-3.3-001 | 处理用户消息 | 发送流式卡片 | mock测试 |
| TC-3.3-002 | 卡片内容逐步更新 | 多次调用updateCardMessage | mock测试 |
| TC-3.3-003 | 最终响应移除光标 | 最终卡片无▌ | 手动测试 |

---

### 模块 3.4: 上下文管理

**文件路径**: `src/services/context-manager.ts`

#### 2.4.1 上下文管理器

```typescript
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '10000');
const THREAD_MESSAGE_LIMIT = parseInt(process.env.THREAD_MESSAGE_LIMIT || '20');
const MAX_RETRIEVAL_CHUNKS = parseInt(process.env.MAX_RETRIEVAL_CHUNKS || '5');

export interface ContextConfig {
  maxMessageLength: number;
  threadMessageLimit: number;
  maxRetrievalChunks: number;
  tokenBudgetPercent: number;  // 预留20%给系统prompt和检索结果
}

export class ContextManager {
  private config: ContextConfig = {
    maxMessageLength: MAX_MESSAGE_LENGTH,
    threadMessageLimit: THREAD_MESSAGE_LIMIT,
    maxRetrievalChunks: MAX_RETRIEVAL_CHUNKS,
    tokenBudgetPercent: 0.2,
  };

  truncateMessage(content: string): string {
    if (content.length > this.config.maxMessageLength) {
      return content.slice(0, this.config.maxMessageLength) + 
        '\n\n[消息已截断，超出最大长度限制]';
    }
    return content;
  }

  truncateHistory(messages: any[], limit?: number): any[] {
    const messageLimit = limit || this.config.threadMessageLimit;
    if (messages.length <= messageLimit) {
      return messages;
    }
    return messages.slice(-messageLimit);
  }

  calculateTokenBudget(contextWindow: number): number {
    // 预留20%给系统prompt和检索结果
    return Math.floor(contextWindow * (1 - this.config.tokenBudgetPercent));
  }

  truncateForTokenBudget(
    content: string,
    contextWindow: number,
    currentTokens: number
  ): string {
    const budget = this.calculateTokenBudget(contextWindow);
    const contentTokens = this.estimateTokens(content);
    
    if (currentTokens + contentTokens <= budget) {
      return content;
    }

    // 按比例截断
    const ratio = budget / (currentTokens + contentTokens);
    const truncatedLength = Math.floor(content.length * ratio);
    return content.slice(0, truncatedLength) + '\n\n[内容已截断以符合Token限制]';
  }

  private estimateTokens(text: string): number {
    // 简单估算：中文约2字符=1token，英文约4字符=1token
    let tokens = 0;
    for (const char of text) {
      if (char.charCodeAt(0) > 127) {
        tokens += 0.5;  // 中文
      } else {
        tokens += 0.25;  // 英文/符号
      }
    }
    return Math.ceil(tokens);
  }

  getConfig(): ContextConfig {
    return { ...this.config };
  }
}
```

#### 2.4.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 消息截断 | 超过10000字符的消息被截断 | 单元测试 |
| 历史截断 | 超过20条消息只保留最近20条 | 单元测试 |
| Token估算 | 估算结果合理 | 人工验证 |

#### 2.4.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-3.4-001 | 10001字符消息 | 返回截断后消息 | 单元测试 |
| TC-3.4-002 | 25条历史消息 | 返回最近20条 | 单元测试 |
| TC-3.4-003 | Token估算-中文 | 估算合理 | 单元测试 |

---

### 模块 3.5: Admin模型管理API

**文件路径**: `src/routers/admin.ts`

#### 2.5.1 Admin模型API

```typescript
import { Hono } from 'hono';
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { encryptForStorage } from '../core/encryption';

const admin = new Hono();
let db: Database;

export function initAdminRouter(database: Database) {
  db = database;
}

// 获取所有模型
admin.get('/models', async (c) => {
  const rows = db.prepare(`
    SELECT id, name, provider, base_url, model_id, is_default, max_tokens, temperature, enabled, created_at, updated_at
    FROM models
    ORDER BY is_default DESC, created_at ASC
  `).all();

  return c.json({
    models: rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      modelId: row.model_id,
      baseUrl: row.base_url,
      isDefault: row.is_default === 1,
      maxTokens: row.max_tokens,
      temperature: row.temperature,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  });
});

// 添加模型
admin.post('/models', async (c) => {
  const body = await c.req.json();
  const { name, provider, apiKey, baseUrl, modelId, isDefault, maxTokens, temperature } = body;

  // 加密API Key
  const encryptedKey = encryptForStorage(apiKey);

  const id = uuidv4();
  const now = new Date().toISOString();

  // 如果设为默认，先取消其他默认
  if (isDefault) {
    db.prepare('UPDATE models SET is_default = 0').run();
  }

  db.prepare(`
    INSERT INTO models 
    (id, name, provider, api_key_encrypted, base_url, model_id, is_default, max_tokens, temperature, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, name, provider, encryptedKey, baseUrl, modelId, isDefault ? 1 : 0, maxTokens || 4096, temperature || 0.7, now, now);

  return c.json({ id, success: true }, 201);
});

// 更新模型
admin.put('/models/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, message: 'Model not found' }, 404);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (body.apiKey) {
    updates.push('api_key_encrypted = ?');
    values.push(encryptForStorage(body.apiKey));
  }
  if (body.name) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.isDefault) {
    updates.push('is_default = ?');
    values.push(1);
    // 取消其他默认
    db.prepare('UPDATE models SET is_default = 0 WHERE id != ?').run(id);
  }
  if (body.maxTokens) {
    updates.push('max_tokens = ?');
    values.push(body.maxTokens);
  }
  if (body.temperature !== undefined) {
    updates.push('temperature = ?');
    values.push(body.temperature);
  }
  if (body.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(body.enabled ? 1 : 0);
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return c.json({ success: true });
});

// 删除模型
admin.delete('/models/:id', async (c) => {
  const id = c.req.param('id');

  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, message: 'Model not found' }, 404);
  }

  db.prepare('DELETE FROM models WHERE id = ?').run(id);

  return c.json({ success: true });
});

export default admin;
```

#### 2.5.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| GET /models | 返回所有模型列表 | curl测试 |
| POST /models | 创建新模型，API Key加密存储 | curl + 数据库检查 |
| PUT /models/:id | 更新模型信息 | curl测试 |
| DELETE /models/:id | 删除模型 | curl测试 |
| 设置默认模型 | 原默认被取消 | 数据库检查 |

#### 2.5.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-3.5-001 | GET /models | 返回模型数组 | curl测试 |
| TC-3.5-002 | POST /models | 创建成功，Key加密 | curl + 数据库 |
| TC-3.5-003 | PUT设置默认 | 其他默认被取消 | 数据库验证 |
| TC-3.5-004 | DELETE默认模型 | 删除成功 | curl测试 |

---

## 3. 开发流程

### Phase 1: 模块实现

每个模块完成后进行 **Commit 1**:

```bash
git add .
git commit -m "Sprint 3: 完成 [模块名称] 模块

- 实现功能点A
- 实现功能点B

Co-Authored-By: AI <ai@example.com>"
```

### Phase 2: 单元测试 + Bug修复

完成单元测试，发现并修复问题，然后进行 **Commit 2**:

```bash
git add .
git commit -m "Sprint 3: [模块名称] 单元测试与Bug修复

- 添加单元测试X个
- 修复问题Y

Co-Authored-By: AI <ai@example.com>"
```

### Phase 3: 编写模块文档

编写该模块的README或JSDoc，完成后进行 **Commit 3**:

```bash
git add .
git commit -m "Sprint 3: [模块名称] 文档完善

- 添加API文档
- 添加使用示例

Co-Authored-By: AI <ai@example.com>"
```

---

## 4. Sprint 3 完成标准

### 模块验收清单

| 模块 | 验收状态 | 完成标准 |
|-----|---------|---------|
| 3.1 Session会话管理 | [ ] | Session创建、绑定模型、持久化 |
| 3.2 LLM路由服务 | [ ] | 多模型加载、流式生成 |
| 3.3 流式响应处理 | [ ] | 卡片逐步更新 |
| 3.4 上下文管理 | [ ] | 消息截断、历史限制 |
| 3.5 Admin模型API | [ ] | CRUD操作正常 |

### Sprint交付物

- Session管理器，支持Thread绑定模型
- LLM路由器，支持多模型
- 流式响应处理器
- 上下文管理器
- Admin模型管理API

### Sprint验证

```bash
# 1. 配置OpenAI和Anthropic两个模型
curl -X POST http://localhost:3000/api/admin/models \
  -H "Content-Type: application/json" \
  -d '{"name":"GPT-4o","provider":"openai","apiKey":"sk-xxx","baseUrl":"https://api.openai.com/v1","modelId":"gpt-4o","isDefault":true}'

# 2. 在飞书创建对话
# 3. 选择Claude模型
# 4. 发送问题
# 5. 验证流式输出和模型响应
```

---

## 5. Sprint间依赖

**依赖Sprint 3的模块**: Sprint 4 (MCP集成), Sprint 5 (RAG Pipeline), Sprint 6 (Tool Calling)  
**被Sprint 3依赖**: Sprint 1, Sprint 2

---

**文档版本**: v1.0  
**制定日期**: 2026-04-11  
**依据文档**: ai_feishu-PRD-正式版 v1.1
