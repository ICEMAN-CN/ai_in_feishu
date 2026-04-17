# AI_Feishu 项目完整文档

**文档版本**: v1.0
**撰写日期**: 2026-04-17
**项目状态**: 开发中
**技术栈**: Node.js + Hono.js + React + LanceDB + SQLite

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [核心模块详解](#3-核心模块详解)
4. [代码示例](#4-代码示例)
5. [测试指南](#5-测试指南)
6. [部署指南](#6-部署指南)
7. [使用指南](#7-使用指南)
8. [API参考](#8-api参考)
9. [环境变量](#9-环境变量)
10. [故障排除](#10-故障排除)

---

## 1. 项目概述

### 1.1 项目简介

AI_Feishu 是一款**飞书原生本地 AI 知识库**应用，旨在为飞书用户提供无缝的 AI 对话和知识管理体验。项目采用 B/S 架构，数据完全本地化存储，确保用户隐私和数据安全。

**核心定位**:

- 100%依托飞书平台作为唯一交互入口
- 本地化部署，数据永不离开用户机器
- 多模型统一接入，支持 OpenAI、Anthropic、Gemini、Ollama 等
- RAG 驱动的知识库检索

**产品形态**:

| 阶段 | 形态 | 说明 |
|------|------|------|
| Phase 1 | B/S 本地 Web App | Local Web App，无桌面端 |
| Phase 2 | Tauri 桌面端 | 跨平台桌面打包，<20MB 包体 |

### 1.2 核心特性

| 特性 | 描述 |
|------|------|
| **飞书原生交互** | 通过飞书 IM（私聊/群聊@机器人）进行对话，支持流式响应 |
| **多模型路由** | 支持配置多个 LLM 提供商，一键切换 |
| **Thread 会话绑定** | 每个飞书 Thread 绑定固定 AI 模型 |
| **本地 RAG 管道** | 文档同步、分块、向量化、语义检索 |
| **MCP 协议集成** | 对接飞书官方 MCP Server |
| **Tool Calling** | AI 自主调用工具读取/创建飞书文档 |
| **AES-256-GCM 加密** | API Key 加密存储，保障安全 |
| **卡片交互** | 启动卡片、模型选择、流式更新卡片 |
| **Admin 控制台** | Web 管理后台，配置模型、知识库、监控状态 |

### 1.3 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **运行时** | Node.js | LTS v20+ | 维持 WebSocket 长连接 |
| **后端框架** | Hono.js | ^4.0.0 | 轻量、类型安全、比 Express 快 3x |
| **前端框架** | React | 18.2.0 | CSR 单页应用 |
| **构建工具** | Vite | 5.0.0 | 极速 HMR |
| **UI 组件** | Tailwind CSS + shadcn/ui | shadcn/ui ^0.5.0 | LobeChat 同款风格 |
| **状态管理** | Zustand | ^4.4.0 | 极简状态管理 |
| **LLM 路由** | Vercel AI SDK | ^0.10.0 | 多厂商统一抽象 |
| **飞书 SDK** | @larksuiteoapi/node-sdk | ^1.5.0 | 官方维护 |
| **向量数据库** | LanceDB | ^0.4.0 | 无头部署、.lance 文件库 |
| **配置数据库** | better-sqlite3 | ^9.0.0 | 嵌入式、零配置 |
| **文档处理** | @langchain/core | ^0.1.0 | TextSplitters 工具 |
| **桌面端** | Tauri | 2.0.0 | Phase 2 规划 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI_Feishu 总体架构                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        用户交互层 (Feishu IM)                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │   │
│  │  │ 私聊会话  │  │ 群聊@   │  │ 卡片交互  │  │ 菜单触发  │               │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘               │   │
│  └───────┼────────────┼────────────┼────────────┼─────────────────────┘   │
│          └────────────┴────────────┴────────────┘                        │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     飞书官方 MCP Server                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ read_document │  │ search_wiki  │  │create_document│              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      本地大核引擎 (Local Core Engine)                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │  Hono.js     │  │ Vercel AI    │  │  MCP Client  │  │  WebSocket│ │   │
│  │  │  REST API    │  │   SDK        │  │   模块        │  │  Manager │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │ RAG Pipeline │  │ Chunking &   │  │  Session     │  │  Config  │ │   │
│  │  │   模块        │  │ Embedding    │  │  Manager     │  │  Store   │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                                │                                            │
│              ┌─────────────────┴─────────────────┐                         │
│              ▼                                   ▼                         │
│  ┌──────────────────────┐             ┌──────────────────────┐            │
│  │    LanceDB           │             │      SQLite          │            │
│  │  (向量数据库)         │             │   (配置数据库)        │            │
│  │  .lance/             │             │   config.db         │            │
│  └──────────────────────┘             └──────────────────────┘            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      前端控制台 (Web Admin UI)                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │   │
│  │  │ 环境配置  │  │ 模型管理  │  │ 知识库绑定 │  │ 状态监控  │               │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 B/S 架构设计

**架构特点**:

1. **本地 Web App (Phase 1)**:
   - 后端：Node.js 进程 + Hono.js REST API
   - 前端：React CSR 单页应用
   - 通信：localhost API 调用
   - 数据流：飞书 ←→ 本地引擎 ←→ 本地数据库

2. **桌面端 (Phase 2)**:
   - Tauri 2.0 打包
   - Node.js 后端作为 Sidecar 伴生进程
   - <20MB 包体，内存占用小

**系统边界约束**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            系统边界约束 (Phase 1 MVP)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ 允许 (MVP范围内)                                                         │
│  ────────────────────────────────────────────────────────────────────────   │
│  • 飞书IM私聊/群聊作为唯一用户交互入口                                        │
│  • Web Admin UI仅做配置和监控                                                │
│  • 本地LanceDB向量库存储知识库                                               │
│  • SQLite存储系统配置                                                       │
│  • MCP协议对接飞书官方能力                                                   │
│  • 多模型路由（OpenAI/Anthropic/Gemini/Ollama）                              │
│  • 创建新的飞书云文档（只写新建，不修改已有文档）                                │
│                                                                             │
│  ❌ 禁止 (Phase 1 MVP明确排除)                                               │
│  ────────────────────────────────────────────────────────────────────────   │
│  • Web端聊天界面                                                            │
│  • 飞书聊天记录自动向量化                                                    │
│  • 修改/覆盖已有飞书文档                                                     │
│  • 复杂知识图谱可视化                                                        │
│  • 多Agent工作流编排                                                        │
│  • 任何云端数据库依赖                                                       │
│  • 多租户场景                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 WebSocket 长连接

飞书机器人通过 `@larksuiteoapi/node-sdk` 的 WebSocket 模式维持持久连接：

**连接流程**:

```
[启动服务]
     │
     ▼
[创建 WebSocketClient]
     │
     ▼
[建立长连接] ──成功──▶ [接收消息事件]
     │                        │
     │ 失败                   ▼
     ▼                  [消息处理器]
[错误处理]                  │
     │                        ▼
     ▼              [Session路由]
[指数退避重连]              │
     │                        ▼
     └──────────────────▶ [流式响应]
```

**断线重连策略**:

| 错误类型 | 处理方式 | 重试策略 |
|----------|----------|----------|
| 401 Unauthorized | 刷新凭证重试 | 立即重试 1 次 |
| 403 Forbidden | 记录告警，终止连接 | 需人工介入 |
| 429 Rate Limited | 指数退避等待 | 5s, 10s, 20s... |
| 1000 Network Error | 标准重连流程 | 指数退避，最大 10 次 |

### 2.4 数据流图

**消息处理流程**:

```
用户发送消息
     │
     ▼
飞书服务器 WebSocket 推送
     │
     ▼
[消息解析与去重]
     │
     ▼
[Session路由分发]
     │
     ▼
     ├─────────────────┬─────────────────┐
     ▼                 ▼                 ▼
[新Thread?]      [已有Thread]      [管理命令?]
     │                 │                 │
     ▼                 ▼                 ▼
[下发启动卡片]   [路由到对应模型]   [执行管理操作]
     │                 │                 │
     └─────────────────┼─────────────────┘
                       ▼
              [流式响应生成]
                       │
                       ▼
              [更新飞书消息卡片]
                       │
                       ▼
                 用户收到回复
```

**RAG 数据流**:

```
飞书文件夹/文档
       │
       ▼
[文档同步服务]
       │
       ▼
[文档清洗与分块] ──▶ LangChain TextSplitter
       │
       ▼
[Embedding生成] ──▶ OpenAI/Ollama Embedding
       │
       ▼
[LanceDB存储]
       │
       ▼
[语义检索] ◀─── 用户查询
       │
       ▼
[检索结果注入上下文]
       │
       ▼
[LLM生成响应]
```

---

## 3. 核心模块详解

### 3.1 MessageHandler - 消息处理

**文件路径**: `src/feishu/message-handler.ts`

**功能描述**: 负责解析飞书消息事件，实现消息去重，提取文本内容。

**核心接口**:

```typescript
// 消息处理器
export class MessageHandler {
  // 解析飞书消息事件为统一格式
  parseMessage(event: FeishuMessageEvent): ParsedMessage;

  // 检查消息是否重复
  isDuplicate(messageId: string): boolean;

  // 判断是否为文本消息
  isTextMessage(parsed: ParsedMessage): boolean;

  // 判断是否为卡片消息
  isInteractiveMessage(parsed: ParsedMessage): boolean;

  // 提取文本内容
  extractTextContent(parsed: ParsedMessage): string;
}
```

**消息类型定义**:

```typescript
// 飞书消息事件结构
interface FeishuMessageEvent {
  header: FeishuMessageHeader;
  event: {
    sender: FeishuMessageSender;
    receiver: { receiver_id: { open_id: string } };
    message: FeishuMessage;
  };
}

// 解析后的消息
interface ParsedMessage {
  eventId: string;
  messageId: string;
  rootId: string;        // Thread根消息ID
  parentId: string;      // 父消息ID
  chatId: string;
  chatType: 'p2p' | 'group';
  messageType: 'text' | 'post' | 'interactive';
  content: any;
  senderOpenId: string;
  senderType: 'user' | 'bot';
  timestamp: string;
}
```

**去重机制**:

- 使用 Set 存储已处理的消息 ID
- 保留最近 10000 个消息 ID，防止内存无限增长
- 超过阈值时自动清理一半旧数据

### 3.2 SessionManager - 会话管理

**文件路径**: `src/core/session-manager.ts`

**功能描述**: 管理飞书 Thread 与 AI 模型的绑定关系，维护会话上下文。

**核心接口**:

```typescript
export class SessionManager {
  // 创建或获取Session
  createOrGetSession(
    p2pId: string,
    rootId?: string,
    parentId?: string,
    modelId?: string
  ): Promise<Session>;

  // 通过ThreadId获取Session
  getSessionByThreadId(threadId: string): Session | null;

  // 保存Session
  saveSession(session: Session): void;

  // 更新消息计数
  updateSessionMessage(sessionId: string, increment?: number): void;

  // 获取对话历史
  getConversation(sessionId: string, limit?: number): Message[];

  // 清理超长Session
  truncateSessionMessages(sessionId: string): void;
}
```

**Thread 模型绑定规则**:

| 场景 | 处理方式 |
|------|----------|
| parentId 为空或等于 rootId | 创建新 Session，绑定默认模型 |
| parentId 存在且 Thread 已存在 | 返回已有 Session（Thread 绑定模型不可更改） |
| parentId 存在但 Thread 不存在 | 抛出错误 |

**数据模型**:

```typescript
interface Session {
  id: string;               // UUID
  threadId: string;        // 飞书 root_id
  p2pId: string;           // 私聊会话ID
  modelId: string;         // 绑定的模型ID
  systemPrompt?: string;   // 定制系统提示词
  messageCount: number;    // 消息计数
  messageLimit: number;   // 消息轮次限制（默认20）
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}
```

### 3.3 LLMRouter - LLM路由

**文件路径**: `src/services/llm-router.ts`

**功能描述**: 统一管理多个 LLM 提供商，通过 Vercel AI SDK 实现多模型路由。

**支持的提供商**:

| 提供商 | 模型示例 | 配置要求 |
|--------|----------|----------|
| OpenAI | GPT-4o, GPT-4-turbo | API Key + Base URL |
| Anthropic | Claude-3.5 Sonnet, Claude-3 | API Key + Base URL |
| Google | Gemini-1.5-Pro, Gemini-1.5-Flash | API Key |
| Ollama | llama3, qwen2, deepseek | Base URL（本地） |

**核心接口**:

```typescript
export class LLMRouter {
  // 获取模型实例
  getModel(modelId?: string): any;

  // 获取模型配置
  getModelConfig(modelId: string): ModelProviderConfig | null;

  // 获取模型名称
  getModelName(modelId: string): string;

  // 流式生成
  streamGenerate(
    modelId: string,
    messages: CoreMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string>;

  // 非流式生成
  generate(
    modelId: string,
    messages: CoreMessage[],
    systemPrompt?: string
  ): Promise<string>;
}
```

**模型配置加密**:

- API Key 使用 AES-256-GCM 加密后存储
- 运行时自动解密
- 数据库中只存储密文

### 3.4 StreamingHandler - 流式响应

**文件路径**: `src/services/streaming-handler.ts`

**功能描述**: 处理用户消息，调用 LLM 流式生成，更新飞书卡片。

**处理流程**:

```
1. 发送初始卡片（"正在思考..."）
2. 构建消息历史
3. 流式生成并更新卡片
   └─ 每 200-500ms 更新一次卡片内容
4. 最终响应（移除光标标记）
5. 更新 Session 消息计数
```

**核心接口**:

```typescript
export class StreamingHandler {
  handleUserMessage(
    chatId: string,
    sessionId: string,
    userMessage: string
  ): Promise<void>;
}
```

### 3.5 RAGPipeline - RAG管道

**文件路径**: `src/services/rag-pipeline.ts`

**功能描述**: 实现文档同步、分块、向量化、存储、检索的完整 RAG 流程。

**子模块**:

| 模块 | 文件 | 功能 |
|------|------|------|
| Chunking | `src/services/chunking.ts` | 文档分块 |
| Embedding | `src/services/embedding.ts` | 向量生成 |
| VectorStore | `src/core/vector-store.ts` | LanceDB 存储 |

**分块策略**:

```
原始文档
    │
    ▼
[标题 + 元数据提取]
    │
    ▼
[LangChain TextSplitter]
    │
    ▼
[固定分块] 或 [段落分块] 或 [语义分块]
  500 tokens     按段落切分     段落级切分
  50 overlap     智能合并短段落
    │
    ▼
[过滤短块 < 100 tokens]
    │
    ▼
[调用Embedding API]
    │
    ▼
[写入LanceDB]
```

**检索流程**:

```typescript
async function search(query: string, topK: number = 5): Promise<检索结果[]> {
  // 1. 将查询向量化
  const queryVector = await embeddingService.embed(query);

  // 2. LanceDB 向量检索
  const results = await vectorStore.search(queryVector, topK);

  // 3. 可选：重排序
  return rerank(results, query);
}
```

### 3.6 VectorStore - 向量存储

**文件路径**: `src/core/vector-store.ts`

**功能描述**: 封装 LanceDB 的向量存储操作。

**核心接口**:

```typescript
export interface VectorStore {
  table: Table;
  db: any;
}

// 初始化
async function initVectorStore(): Promise<VectorStore>;

// 添加文档块
async function addChunks(chunks: DocumentChunk[]): Promise<void>;

// 搜索
async function search(queryVector: number[], topK: number): Promise<检索结果[]>;

// 删除文档
async function deleteByDocId(docId: string): Promise<void>;
```

**LanceDB Schema**:

```typescript
const chunkSchema = new Schema({
  id: new Int32(),               // 自增ID
  doc_id: new Utf8(),            // 源文档ID
  doc_title: new Utf8(),        // 源文档标题
  doc_url: new Utf8(),          // 飞书文档URL
  folder_id: new Utf8(),        // 所属文件夹ID
  text_chunk: new Utf8(),       // 分块文本内容
  token_count: new Int32(),     // token数量
  vector: new Float32(1536),    // 向量数组
  doc_updated_at: new Int64(),  // 文档更新时间戳
  chunk_index: new Int32(),     // 块在文档中的索引
  created_at: new Int64(),      // 创建时间戳
  sync_status: new Utf8(),      // 同步状态
});
```

### 3.7 MCPClient - MCP集成

**文件路径**: `src/core/mcp-client.ts`

**功能描述**: 对接飞书官方 MCP Server，实现标准化工具调用。

**MCP 工具映射**:

| 业务场景 | MCP 工具 | 原生 API 降级 | 权限要求 |
|----------|----------|---------------|----------|
| 即时文档阅读 | read_document | feishu.docx.document.get | 文档读取 |
| 全局搜索 | search_wiki_or_drive | feishu.search | 搜索权限 |
| 创建新文档 | create_document | feishu.docx.document.create | 文档创建 |
| 修改文档 | update_document | (无降级) | 文档编辑 |
| 发送消息 | send_message | feishu.im.message.create | 消息发送 |

**核心接口**:

```typescript
export class MCPClient {
  // 连接到MCP Server
  async connect(): Promise<void>;

  // 检查连接状态
  isConnected(): boolean;

  // 调用MCP工具
  async callTool(toolName: string, args: object): Promise<any>;

  // 获取可用工具列表
  getAvailableTools(): MCPTool[];

  // 降级到原生API
  async callWithFallback(
    mcpTool: string,
    nativeMethod: string,
    args: object
  ): Promise<any>;
}
```

### 3.8 ConfigStore - 配置存储

**文件路径**: `src/core/config-store.ts`

**功能描述**: 封装 SQLite 的配置存储操作。

**数据表**:

| 表名 | 说明 |
|------|------|
| models | 模型配置 |
| sessions | 会话信息 |
| kb_folders | 知识库文件夹 |
| mcp_tool_auth | MCP 工具授权 |
| system_config | 系统配置 |
| schema_version | 数据库版本 |

**核心接口**:

```typescript
export class ConfigStore {
  // 模型操作
  getModels(): ModelConfig[];
  getModelById(id: string): ModelConfig | null;
  saveModel(model: ModelConfig): void;
  deleteModel(id: string): void;

  // 会话操作
  getSessionByThreadId(threadId: string): Session | null;
  saveSession(session: Session): void;

  // 知识库操作
  getKBFolders(): KBFolder[];
  saveKBFolder(folder: KBFolder): void;

  // 系统配置
  getConfig(key: string): string | null;
  setConfig(key: string, value: string): void;
}
```

### 3.9 Encryption - 加密模块

**文件路径**: `src/core/encryption.ts`

**功能描述**: 提供 AES-256-GCM 加密解密功能，用于敏感数据存储。

**加密格式**:

```typescript
interface EncryptedData {
  ciphertext: string;  // Base64 加密数据
  iv: string;          // Base64 初始向量
  tag: string;         // Base64 认证标签
}
```

**存储格式**: JSON 字符串 `{"ciphertext":"...","iv":"...","tag":"..."}`

**核心接口**:

```typescript
// 加密
export function encrypt(plainText: string): EncryptedData;

// 解密
export function decrypt(data: EncryptedData): string;

// 加密后存储
export function encryptForStorage(plainText: string): string;

// 从存储读取解密
export function decryptFromStorage(encryptedStr: string): string;
```

---

## 4. 代码示例

### 4.1 添加新的 LLM Provider

以下示例展示如何添加新提供商（如 DeepSeek）：

```typescript
// src/services/llm-router.ts

// 1. 在 ModelProvider 类型中添加
type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'deepseek';

// 2. 在 loadModels 方法中添加 case
switch (row.provider) {
  // ... 现有 case

  case 'deepseek':
    const { openai: deepseekProvider } = require('@ai-sdk/openai');
    provider = deepseekProvider({
      apiKey,
      baseURL: row.base_url || 'https://api.deepseek.com/v1',
    });
    break;
}

// 3. 在数据库迁移中添加新 provider
// ALTER TABLE models ADD COLUMN provider TEXT CHECK(provider IN ('openai', 'anthropic', 'gemini', 'ollama', 'deepseek'));
```

### 4.2 创建新的 Tool

以下示例展示如何创建 `search_local_kb` 工具：

```typescript
// src/tools/search_local_kb.ts

import { Tool } from '@ai-sdk/sdk';
import { vectorStore } from '../core/vector-store';
import { embeddingService } from '../services/embedding';

export const searchLocalKBTool = Tool({
  name: 'search_local_kb',
  description: '搜索本地知识库，获取与问题相关的文档片段。适用于询问项目细节、技术文档、操作指南等问题。',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索查询内容',
      },
      top_k: {
        type: 'number',
        description: '返回结果数量',
        default: 5,
      },
    },
    required: ['query'],
  },

  async execute({ query, top_k = 5 }) {
    try {
      // 1. 将查询向量化
      const queryVector = await embeddingService.embed(query);

      // 2. 向量检索
      const results = await vectorStore.search(queryVector, top_k);

      // 3. 格式化结果
      if (results.length === 0) {
        return '知识库中未找到相关内容';
      }

      const formatted = results
        .map((r, i) => `[${i + 1}] ${r.doc_title}\n${r.text_chunk}`)
        .join('\n\n');

      return `找到 ${results.length} 条相关结果：\n\n${formatted}`;
    } catch (error) {
      console.error('知识库搜索失败:', error);
      return '知识库搜索失败，请稍后重试';
    }
  },
});
```

### 4.3 处理消息流程

完整的消息处理流程示例：

```typescript
// src/services/message-processor.ts

import { SessionManager } from '../core/session-manager';
import { LLMRouter } from '../services/llm-router';
import { StreamingHandler } from '../services/streaming-handler';
import { MessageHandler } from '../feishu/message-handler';

export class MessageProcessor {
  constructor(
    private sessionManager: SessionManager,
    private llmRouter: LLMRouter,
    private streamingHandler: StreamingHandler,
    private messageHandler: MessageHandler
  ) {}

  async processIncomingMessage(event: FeishuMessageEvent): Promise<void> {
    // 1. 解析消息
    const parsed = this.messageHandler.parseMessage(event);

    // 2. 跳过非文本消息（可扩展）
    if (!this.messageHandler.isTextMessage(parsed)) {
      console.log('非文本消息，跳过处理');
      return;
    }

    // 3. 提取文本内容
    const textContent = this.messageHandler.extractTextContent(parsed);

    // 4. 创建或获取 Session
    const session = await this.sessionManager.createOrGetSession(
      parsed.chatId,
      parsed.rootId,
      parsed.parentId
    );

    // 5. 处理管理命令
    if (this.isAdminCommand(textContent)) {
      await this.handleAdminCommand(parsed, session);
      return;
    }

    // 6. 流式处理用户消息
    await this.streamingHandler.handleUserMessage(
      parsed.chatId,
      session.threadId,
      textContent
    );
  }

  private isAdminCommand(content: string): boolean {
    return content.startsWith('/admin ') || content.startsWith('/配置');
  }
}
```

### 4.4 使用 RAG 检索

RAG 检索集成示例：

```typescript
// src/services/rag-service.ts

import { embeddingService } from './embedding';
import { vectorStore } from '../core/vector-store';

export interface RetrievalResult {
  doc_id: string;
  doc_title: string;
  doc_url: string;
  text_chunk: string;
  score: number;
}

export class RAGService {
  // 检索相关文档
  async retrieve(
    query: string,
    topK: number = 5,
    folderIds?: string[]
  ): Promise<RetrievalResult[]> {
    // 1. 生成查询向量
    const queryVector = await embeddingService.embed(query);

    // 2. 执行向量搜索
    const results = await vectorStore.search(queryVector, topK * 2);

    // 3. 可选：按文件夹过滤
    const filtered = folderIds
      ? results.filter(r => folderIds.includes(r.folder_id))
      : results;

    // 4. 可选：重排序
    const reranked = this.rerank(filtered, query);

    return reranked.slice(0, topK);
  }

  // 注入检索结果到上下文
  buildRAGContext(retrievalResults: RetrievalResult[]): string {
    if (retrievalResults.length === 0) {
      return '';
    }

    const header = '【参考知识库内容】\n\n';
    const content = retrievalResults
      .map((r, i) => `[${i + 1}] ${r.doc_title}\n来源: ${r.doc_url}\n${r.text_chunk}`)
      .join('\n\n---\n\n');

    return header + content;
  }

  // 简单重排序（可根据实际情况使用更复杂的模型）
  private rerank(results: RetrievalResult[], query: string): RetrievalResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);

    return results
      .map(r => {
        let score = r.score;
        const titleTerms = r.doc_title.toLowerCase();
        const contentTerms = r.text_chunk.toLowerCase();

        // 标题命中加分
        queryTerms.forEach(term => {
          if (titleTerms.includes(term)) score += 0.1;
          if (contentTerms.includes(term)) score += 0.05;
        });

        return { ...r, score };
      })
      .sort((a, b) => b.score - a.score);
  }
}
```

---

## 5. 测试指南

### 5.1 运行测试

**测试命令**:

```bash
# 运行所有测试
npm test

# 运行指定文件
npm test -- src/services/llm-router.test.ts

# 监听模式（文件变化自动运行）
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e
```

**测试配置** (vitest.config.ts):

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.d.ts'],
    },
    testTimeout: 10000,
  },
});
```

### 5.2 编写测试

**单元测试示例**:

```typescript
// src/services/llm-router.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMRouter } from './llm-router';

// Mock 依赖
vi.mock('../core/encryption', () => ({
  decryptFromStorage: vi.fn((key) => `decrypted_${key}`),
}));

describe('LLMRouter', () => {
  let router: LLMRouter;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue(null),
      }),
    };
    router = new LLMRouter(mockDb);
  });

  describe('getModel', () => {
    it('无模型时抛出错误', () => {
      expect(() => router.getModel()).toThrow('No model available');
    });

    it('指定不存在模型时抛出错误', () => {
      router = new LLMRouter(mockDb);
      expect(() => router.getModel('non-existent')).toThrow('Model not found');
    });
  });

  describe('streamGenerate', () => {
    it('返回 AsyncGenerator', async () => {
      const generator = router.streamGenerate('model-id', []);
      expect(generator[Symbol.asyncIterator]).toBeDefined();
    });
  });
});
```

**集成测试示例**:

```typescript
// tests/integration/message-handler.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase } from '../../scripts/init-db';
import { MessageHandler } from '../../src/feishu/message-handler';

describe('MessageHandler Integration', () => {
  let handler: MessageHandler;
  let testDb: any;

  beforeAll(() => {
    testDb = initDatabase({ test: true });
    handler = new MessageHandler();
  });

  afterAll(() => {
    testDb.close();
  });

  it('解析真实飞书消息事件', () => {
    const event = {
      header: {
        event_id: 'test-event-123',
        event_type: 'im.message.receive_v1',
        create_time: '2024-01-01T00:00:00Z',
        token: 'test-token',
        app_id: 'test-app',
        tenant_key: 'test-tenant',
      },
      event: {
        sender: { sender_id: { open_id: 'user-123' }, sender_type: 'user' },
        receiver: { receiver_id: { open_id: 'bot-123' }, receiver_type: 'bot' },
        message: {
          message_id: 'msg-123',
          root_id: 'root-123',
          parent_id: '',
          create_time: '2024-01-01T00:00:01Z',
          chat_id: 'chat-123',
          chat_type: 'p2p',
          message_type: 'text',
          content: JSON.stringify({ text: '你好，AI!' }),
        },
      },
    };

    const parsed = handler.parseMessage(event);

    expect(parsed.eventId).toBe('test-event-123');
    expect(parsed.messageId).toBe('msg-123');
    expect(parsed.rootId).toBe('root-123');
    expect(parsed.senderOpenId).toBe('user-123');
  });

  it('消息去重功能正常', () => {
    const msgId = 'dedup-test-msg';

    expect(handler.isDuplicate(msgId)).toBe(false);
    expect(handler.isDuplicate(msgId)).toBe(true);
  });
});
```

### 5.3 测试覆盖范围

| 模块 | 单元测试 | 集成测试 | 覆盖目标 |
|------|----------|----------|----------|
| MessageHandler | 消息解析、去重、类型判断 | 真实事件解析 | 90% |
| SessionManager | Session CRUD、绑定逻辑 | 数据库操作 | 85% |
| LLMRouter | 模型加载、切换 | API 调用 | 80% |
| StreamingHandler | 流式处理逻辑 | 飞书消息交互 | 85% |
| RAGPipeline | 分块、检索 | 文档同步 | 80% |
| ConfigStore | CRUD 操作 | 数据库操作 | 90% |
| Encryption | 加密解密 roundtrip | Key 管理 | 95% |
| MCPClient | 工具调用、降级 | MCP Server | 75% |

### 5.4 性能测试

**基准测试**:

```typescript
// benchmarks/llm-router.bench.ts

import { bench, describe } from 'vitest';
import { LLMRouter } from '../src/services/llm-router';

describe('LLMRouter Performance', () => {
  bench('getModel - 缓存命中', () => {
    router.getModel('cached-model-id');
  });

  bench('streamGenerate - 首字延迟', async () => {
    const generator = router.streamGenerate('model-id', [
      { role: 'user', content: 'Hello' },
    ]);

    for await (const _ of generator) {
      break; // 只取首字
    }
  });
});
```

**运行基准测试**:

```bash
npm run bench
```

---

## 6. 部署指南

### 6.1 开发环境

**前置要求**:

- Node.js 20.11.0 LTS
- npm 10.x+
- Git

**快速开始**:

```bash
# 1. 克隆代码
git clone https://github.com/your-org/ai_feishu.git
cd ai_feishu

# 2. 安装依赖
npm install

# 3. 复制环境变量模板
cp .env.example .env

# 4. 编辑 .env，填写配置
vim .env

# 5. 初始化数据库
npm run init-db

# 6. 启动开发服务器
npm run dev
```

### 6.2 生产环境

**系统要求**:

| 组件 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 20 GB | 50 GB |
| 操作系统 | Ubuntu 20.04+ / macOS 12+ | Ubuntu 22.04 LTS |

**构建步骤**:

```bash
# 1. 安装依赖
npm ci

# 2. 类型检查
npm run typecheck

# 3. 构建
npm run build

# 4. 压缩发布
tar -czvf ai_feishu.tar.gz dist/ data/ .env
```

**启动服务**:

```bash
# 使用 PM2 管理进程
pm2 start dist/index.js --name ai_feishu

# 查看状态
pm2 status ai_feishu

# 查看日志
pm2 logs ai_feishu

# 重启
pm2 restart ai_feishu
```

### 6.3 Docker 部署

**Dockerfile**:

```dockerfile
FROM node:20-slim

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY dist/ ./dist/
COPY data/ ./data/

# 环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000 3001

# 启动命令
CMD ["node", "dist/index.js"]
```

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  ai_feishu:
    build: .
    ports:
      - "3000:3000"  # API 端口
      - "3001:3001"  # Admin 端口
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**启动命令**:

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 6.4 PM2 部署

**安装 PM2**:

```bash
npm install -g pm2
```

**ecosystem.config.js**:

```javascript
module.exports = {
  apps: [
    {
      name: 'ai_feishu',
      script: 'dist/index.js',
      cwd: '/path/to/ai_feishu',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
```

**部署命令**:

```bash
# 启动
pm2 start ecosystem.config.js

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup

# 滚动更新
pm2 deploy ecosystem.config.js production update
```

---

## 7. 使用指南

### 7.1 飞书机器人使用

**添加机器人**:

1. 打开飞书，进入「工作台」
2. 搜索「AI_Feishu」或自定义的机器人名称
3. 点击「添加」

**开始对话**:

1. 与机器人开启私聊
2. 输入「你好」或「/help」查看帮助
3. 选择 AI 模型开始对话

**群聊使用**:

1. 在群聊中 @机器人
2. 发送问题
3. 机器人会在群聊中回复

**命令列表**:

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助信息 |
| `/model [模型名]` | 切换模型 |
| `/models` | 列出可用模型 |
| `/clear` | 清除当前对话历史 |
| `/kb search [关键词]` | 搜索知识库 |
| `/admin` | 打开管理面板（仅私聊） |

### 7.2 管理后台使用

**访问地址**: `http://localhost:3001`（开发环境）

**登录**: 使用 `ADMIN_API_SECRET` 环境变量配置的值

**功能模块**:

#### 7.2.1 环境配置 (Settings)

| 配置项 | 说明 |
|--------|------|
| 飞书 App ID | 飞书应用标识 |
| 飞书 App Secret | 飞书应用密钥 |
| MCP Server URL | MCP 服务地址 |
| 会话消息限制 | 每轮对话保留消息数 |
| 知识库同步间隔 | 文档同步周期（秒） |

#### 7.2.2 模型管理 (Models)

- 查看所有已配置模型
- 添加新模型（OpenAI/Anthropic/Gemini/Ollama）
- 编辑模型参数
- 设置默认模型
- 删除模型

**添加模型步骤**:

1. 点击「添加模型」
2. 选择提供商
3. 填写名称、API Key、模型 ID
4. 设置默认参数（Temperature、Max Tokens）
5. 点击「保存」

#### 7.2.3 知识库绑定 (Knowledge Base)

- 配置知识库文件夹
- 查看同步状态
- 手动触发同步
- 查看文档数量统计

**添加知识库文件夹**:

1. 在飞书中复制文件夹链接
2. 粘贴到「文件夹 URL」输入框
3. 点击「添加」
4. 配置同步间隔

#### 7.2.4 状态监控 (Dashboard)

| 指标 | 说明 |
|------|------|
| WebSocket 状态 | 连接/断开 |
| 消息处理数 | 今日处理消息数 |
| Token 使用 | 本小时 Token 消耗 |
| 知识库文档数 | 已同步文档总数 |
| 模型调用次数 | 各模型调用统计 |

### 7.3 知识库配置

**配置流程**:

```
飞书文件夹链接
    │
    ▼
提取 folder_token
    │
    ▼
存入 SQLite (kb_folders 表)
    │
    ▼
定时任务触发同步
    │
    ▼
MCP/原生API 获取文档列表
    │
    ▼
文档内容抓取
    │
    ▼
分块 + 向量化
    │
    ▼
存入 LanceDB
```

**同步机制**:

| 同步类型 | 触发方式 | 说明 |
|----------|----------|------|
| 全量同步 | 手动触发 | 重新同步所有文档 |
| 增量同步 | 定时任务 | 仅同步新增/修改的文档 |
| 单文档同步 | API 调用 | 同步指定文档 |

### 7.4 模型配置

**OpenAI 配置示例**:

| 字段 | 值 |
|------|-----|
| 提供商 | openai |
| 名称 | GPT-4o |
| API Key | sk-... |
| Base URL | https://api.openai.com/v1 |
| 模型 ID | gpt-4o |
| Temperature | 0.7 |
| Max Tokens | 4096 |

**Anthropic 配置示例**:

| 字段 | 值 |
|------|-----|
| 提供商 | anthropic |
| 名称 | Claude-3.5 Sonnet |
| API Key | sk-ant-... |
| Base URL | https://api.anthropic.com |
| 模型 ID | claude-3-5-sonnet-20240620 |
| Temperature | 0.7 |
| Max Tokens | 4096 |

**Ollama 配置示例**:

| 字段 | 值 |
|------|-----|
| 提供商 | ollama |
| 名称 | Llama-3 (本地) |
| API Key | (留空) |
| Base URL | http://localhost:11434 |
| 模型 ID | llama3 |
| Temperature | 0.7 |
| Max Tokens | 4096 |

---

## 8. API参考

### 8.1 API 概览

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/health` | GET | 健康检查 | 无 |
| `/api/callback/feishu` | POST | 飞书回调 | 签名校验 |
| `/api/admin/models` | GET | 获取模型列表 | API Secret |
| `/api/admin/models` | POST | 添加模型 | API Secret |
| `/api/admin/models/:id` | PUT | 更新模型 | API Secret |
| `/api/admin/models/:id` | DELETE | 删除模型 | API Secret |
| `/api/admin/sessions` | GET | 获取会话列表 | API Secret |
| `/api/admin/sessions/:threadId` | GET | 获取会话详情 | API Secret |
| `/api/admin/kb/folders` | GET | 获取知识库文件夹 | API Secret |
| `/api/admin/kb/folders` | POST | 添加文件夹 | API Secret |
| `/api/admin/kb/folders/:id` | DELETE | 删除文件夹 | API Secret |
| `/api/admin/kb/sync` | POST | 触发同步 | API Secret |
| `/api/admin/config` | GET | 获取配置 | API Secret |
| `/api/admin/config` | PUT | 更新配置 | API Secret |
| `/api/admin/stats` | GET | 获取统计 | API Secret |

### 8.2 认证方式

**API Secret 认证**:

```bash
# Header 方式
curl -H "X-API-Secret: your-secret-key" http://localhost:3000/api/admin/models

# Query 参数方式
curl "http://localhost:3000/api/admin/models?api_secret=your-secret-key"
```

### 8.3 响应格式

**成功响应**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    // 响应数据
  }
}
```

**错误响应**:

```json
{
  "code": 404,
  "msg": "Model not found",
  "data": null
}
```

### 8.4 端点详情

#### GET /api/health

**响应**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "status": "healthy",
    "ws_connected": true,
    "db_connected": true,
    "vector_db_connected": true,
    "uptime": 3600,
    "version": "0.1.0"
  }
}
```

#### GET /api/admin/models

**响应**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "models": [
      {
        "id": "uuid-1",
        "name": "GPT-4o",
        "provider": "openai",
        "modelId": "gpt-4o",
        "baseUrl": "https://api.openai.com/v1",
        "isDefault": true,
        "maxTokens": 4096,
        "temperature": 0.7,
        "enabled": true,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### POST /api/admin/models

**请求**:

```json
{
  "name": "Claude-3.5 Sonnet",
  "provider": "anthropic",
  "apiKey": "sk-ant-...",
  "baseUrl": "https://api.anthropic.com",
  "modelId": "claude-3-5-sonnet-20240620",
  "isDefault": false,
  "maxTokens": 4096,
  "temperature": 0.7
}
```

**响应**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "uuid-2",
    "success": true
  }
}
```

#### POST /api/admin/kb/sync

**响应**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "synced": 42,
    "failed": 1,
    "duration": 12345
  }
}
```

---

## 9. 环境变量

### 9.1 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `FEISHU_APP_ID` | 飞书应用 App ID | `cli_xxxxxxxxxxxxxx` |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret | `xxxxxxxxxxxxxxxxxxxx` |
| `ADMIN_API_SECRET` | Admin API 访问密钥 | `your-secret-key` |
| `ENCRYPTION_KEY` | AES-256-GCM 加密密钥（64位 hex） | `0123456789...` (64字符) |

### 9.2 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `FEISHU_BOT_NAME` | 飞书机器人名称 | `AI_Feishu` |
| `MCP_SERVER_URL` | MCP Server 地址 | `http://localhost:3001` |
| `MCP_SERVER_TOKEN` | MCP Server Token | (空) |
| `MCP_FALLBACK_ENABLED` | MCP 不可用时降级 | `true` |
| `OPENAI_API_KEY` | OpenAI API Key | (空) |
| `OPENAI_BASE_URL` | OpenAI API 地址 | `https://api.openai.com/v1` |
| `ANTHROPIC_API_KEY` | Anthropic API Key | (空) |
| `ANTHROPIC_BASE_URL` | Anthropic API 地址 | `https://api.anthropic.com` |
| `GEMINI_API_KEY` | Google Gemini API Key | (空) |
| `OLLAMA_BASE_URL` | Ollama 本地地址 | `http://localhost:11434` |
| `EMBEDDING_PROVIDER` | Embedding 提供商 | `openai` |
| `EMBEDDING_MODEL` | Embedding 模型 | `text-embedding-3-small` |
| `EMBEDDING_DIMENSION` | Embedding 维度 | `1536` |
| `PORT` | API 服务端口 | `3000` |
| `ADMIN_PORT` | Admin 服务端口 | `3001` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `NODE_ENV` | 运行环境 | `development` |
| `KB_FOLDER_URLS` | 知识库文件夹 URL（逗号分隔） | (空) |
| `KB_SYNC_INTERVAL` | 知识库同步间隔（秒） | `3600` |
| `KB_CHUNK_SIZE` | 分块大小（token） | `500` |
| `KB_CHUNK_OVERLAP` | 分块重叠（token） | `50` |
| `THREAD_MESSAGE_LIMIT` | Thread 消息轮次限制 | `20` |
| `MAX_RETRIEVAL_CHUNKS` | 最多注入检索结果数 | `5` |
| `MAX_MESSAGE_LENGTH` | 最大消息长度 | `10000` |
| `ALLOWED_FEISHU_USERS` | 允许使用的用户 ID（逗号分隔） | (空 = 全部允许) |
| `DATA_DIR` | 数据目录 | `./data` |
| `VECTOR_DB_PATH` | LanceDB 路径 | `./data/vectors` |
| `SQLITE_PATH` | SQLite 路径 | `./data/config.db` |

### 9.3 默认值

**.env.example 完整模板**:

```bash
# ==================== 飞书配置 ====================
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
FEISHU_BOT_NAME=AI_Feishu

# ==================== MCP配置 ====================
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_TOKEN=
MCP_FALLBACK_ENABLED=true

# ==================== LLM配置 (示例) ====================
OPENAI_API_KEY=sk-xxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1

ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxx
ANTHROPIC_BASE_URL=https://api.anthropic.com

GEMINI_API_KEY=xxxxxxxxxxxxxx

OLLAMA_BASE_URL=http://localhost:11434

# ==================== Embedding配置 ====================
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# ==================== 系统配置 ====================
PORT=3000
ADMIN_PORT=3001
LOG_LEVEL=info
NODE_ENV=development
ADMIN_API_SECRET=your-secret-key-here

# ==================== 知识库配置 ====================
KB_FOLDER_URLS=
KB_SYNC_INTERVAL=3600
KB_CHUNK_SIZE=500
KB_CHUNK_OVERLAP=50
THREAD_MESSAGE_LIMIT=20
MAX_RETRIEVAL_CHUNKS=5
MAX_MESSAGE_LENGTH=10000

# ==================== 安全配置 ====================
ALLOWED_FEISHU_USERS=
ENCRYPTION_KEY=your-64-char-hex-key-here

# ==================== 存储配置 ====================
DATA_DIR=./data
VECTOR_DB_PATH=./data/vectors
SQLITE_PATH=./data/config.db
```

---

## 10. 故障排除

### 10.1 常见问题

#### Q1: WebSocket 连接失败

**症状**: 日志显示 `[WS] Connection error`

**排查步骤**:

1. 检查 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 是否正确
2. 确认飞书应用的机器人能力已开启
3. 检查应用权限是否包含 `im:message`
4. 查看飞书开放平台的错误码

**解决方案**:

```bash
# 重启服务
pm2 restart ai_feishu

# 检查日志
pm2 logs ai_feishu --lines 100
```

#### Q2: 模型调用失败

**症状**: 消息发送后无响应或报错

**排查步骤**:

1. 检查 API Key 是否正确配置
2. 确认 API Key 有足够的额度
3. 检查 Base URL 是否可访问
4. 查看模型 ID 是否正确

**解决方案**:

```bash
# 测试 API 连接
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# 更新模型配置
curl -X PUT http://localhost:3000/api/admin/models/{id} \
  -H "X-API-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

#### Q3: 知识库检索无结果

**症状**: 搜索知识库返回空或无关结果

**排查步骤**:

1. 确认知识库已同步文档
2. 检查 Embedding 服务是否正常
3. 验证 LanceDB 数据是否存在

**解决方案**:

```bash
# 手动触发同步
curl -X POST http://localhost:3000/api/admin/kb/sync \
  -H "X-API-Secret: your-secret"

# 检查向量库状态
curl http://localhost:3000/api/admin/stats \
  -H "X-API-Secret: your-secret"
```

#### Q4: 数据库初始化失败

**症状**: `config.db` 无法创建或读取

**排查步骤**:

1. 检查 `DATA_DIR` 目录权限
2. 确认磁盘空间充足
3. 检查 SQLite 版本兼容性

**解决方案**:

```bash
# 手动创建目录
mkdir -p data/vectors

# 重新初始化
npm run init-db

# 检查文件权限
ls -la data/
```

### 10.2 错误代码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| `401` | 签名校验失败 | 检查 `FEISHU_VERIFICATION_TOKEN` |
| `401` | WebSocket 认证失败 | 刷新飞书 App Credentials |
| `403` | 权限不足 | 检查飞书应用权限配置 |
| `429` | 请求限流 | 降低调用频率或升级套餐 |
| `1001` | 数据库连接失败 | 检查 SQLite 路径和权限 |
| `1002` | 向量库连接失败 | 检查 LanceDB 目录 |
| `1003` | 加密密钥无效 | 重新生成 64 位 hex 密钥 |
| `2001` | 模型未找到 | 检查模型 ID 配置 |
| `2002` | 模型调用失败 | 检查 API Key 和网络 |
| `2003` | Embedding 服务异常 | 检查 Embedding 配置 |
| `3001` | Session 不存在 | 重新发起对话 |
| `3002` | Thread 绑定冲突 | Thread 已绑定其他模型 |

### 10.3 调试方法

**日志级别调整**:

```bash
# 开发环境：详细日志
LOG_LEVEL=debug npm run dev

# 生产环境：只记录错误
LOG_LEVEL=error pm2 restart ai_feishu
```

**调试 Endpoints**:

```bash
# 测试消息解析
curl -X POST http://localhost:3000/api/callback/feishu \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 测试模型连接
curl http://localhost:3000/api/admin/models \
  -H "X-API-Secret: your-secret"

# 查看 Session 详情
curl http://localhost:3000/api/admin/sessions/{threadId} \
  -H "X-API-Secret: your-secret"
```

**网络调试**:

```bash
# 检查飞书 API 连通性
curl -v https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal \
  -H "Content-Type: application/json" \
  -d '{"app_id":"xxx","app_secret":"xxx"}'

# 检查 Ollama 连通性
curl http://localhost:11434/api/tags
```

**性能分析**:

```bash
# 启用性能分析
NODE_OPTIONS="--prof" npm run dev

# 生成性能报告
node --prof-process isolate-*.log > profile.txt
```

---

## 附录

### A. 目录结构

```
ai_feishu/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .env.example
│
├── src/
│   ├── index.ts                 # 后端入口
│   ├── app.ts                   # Hono.js 应用
│   │
│   ├── core/                    # 核心模块
│   │   ├── ws-manager.ts       # WebSocket 管理
│   │   ├── mcp-client.ts       # MCP 客户端
│   │   ├── session-manager.ts  # 会话管理
│   │   ├── config-store.ts     # 配置存储
│   │   ├── vector-store.ts     # 向量存储
│   │   └── encryption.ts       # 加密模块
│   │
│   ├── routers/                 # API 路由
│   │   ├── admin.ts            # 管理 API
│   │   ├── health.ts           # 健康检查
│   │   └── callback.ts         # 飞书回调
│   │
│   ├── services/               # 业务服务
│   │   ├── llm-router.ts       # LLM 路由
│   │   ├── rag-pipeline.ts     # RAG 管道
│   │   ├── chunking.ts         # 文档分块
│   │   ├── embedding.ts         # 向量化
│   │   ├── streaming-handler.ts # 流式处理
│   │   └── context-manager.ts  # 上下文管理
│   │
│   ├── tools/                  # Tool 定义
│   │   ├── index.ts
│   │   ├── read_feishu_url.ts
│   │   ├── search_local_kb.ts
│   │   └── save_to_new_doc.ts
│   │
│   ├── feishu/                 # 飞书集成
│   │   ├── client.ts
│   │   ├── card-builder.ts
│   │   ├── message-handler.ts
│   │   └── validator.ts
│   │
│   └── types/                  # 类型定义
│       ├── config.ts
│       ├── session.ts
│       └── message.ts
│
├── admin/                      # React 前端
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   ├── stores/
│   │   └── lib/
│   └── package.json
│
├── data/                       # 数据目录
│   ├── config.db              # SQLite 数据库
│   └── vectors/               # LanceDB 向量库
│       └── *.lance
│
├── scripts/                    # 运维脚本
│   ├── init-db.ts
│   └── sync-kb.ts
│
└── tests/                      # 测试文件
    ├── unit/
    ├── integration/
    └── e2e/
```

### B. 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-04-17 | 初始文档创建 |

### C. 参考资源

- [飞书开放平台文档](https://open.feishu.cn/document/)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/)
- [LanceDB 文档](https://lancedb.github.io/lancedb/)
- [Hono.js 文档](https://hono.dev/)
- [MCP 协议规范](https://modelcontextprotocol.io/)

---

**文档结束**
