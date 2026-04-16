# AI_Feishu

飞书原生本地 AI 知识库助手

---

## 项目简介

AI_Feishu 是一款运行在本地环境的 AI 助手应用，深度集成飞书平台，提供多模型路由、本地向量知识库检索、MCP 协议集成等核心功能。所有数据均存储在本地，无需依赖外部数据库服务。

### 核心特性

- **飞书原生交互**: 通过 WebSocket 长连接接收消息，支持流式响应和交互式卡片消息
- **本地向量知识库**: 基于 LanceDB 的嵌入式向量数据库，支持文档同步、分块、 embedding 存储和语义检索
- **多模型路由**: 支持 OpenAI、Anthropic、Google Gemini、Ollama 四种模型提供方，自动路由和故障切换
- **MCP 协议集成**: 连接飞书官方 MCP Server，支持工具调用和认证管理
- **流式响应**: 基于 Server-Sent Events 的流式输出，实时推送 AI 生成内容
- **会话管理**: 基于线程的会话管理，支持上下文续持和消息历史

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn

### 安装步骤

```bash
# 克隆项目后进入目录
cd ai_feishu

# 安装依赖
npm install

# 初始化数据库
npm run init-db
```

### 配置

复制 `.env.example` 并重命名为 `.env`，填入必要的配置信息：

```bash
cp .env.example .env
```

关键配置项说明：

```bash
# 飞书应用凭证（必需）
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx

# 管理接口密钥（建议设置）
ADMIN_API_SECRET=your-secret-key

# LLM API 密钥（至少配置一个）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxx

# 向量 embedding 配置
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
```

### 运行命令

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 生产环境启动
npm start

# 类型检查
npm run typecheck

# 代码检查
npm run lint
```

---

## 架构说明

### 系统架构

AI_Feishu 采用 B/S 架构设计，后端基于 Hono 框架构建 RESTful API 服务，通过 WebSocket 与飞书服务器保持长连接。

```
┌─────────────────────────────────────────────────────────────┐
│                         飞书平台                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ WebSocket   │  │  Callback   │  │     MCP Server      │  │
│  │ 长连接      │  │   Webhook   │  │  (工具调用)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI_Feishu Server                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  消息处理     │  │   LLM 路由    │  │   RAG 管道        │  │
│  │  MessageHandler │ │  LLMRouter  │  │   RAGPipeline    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  会话管理     │  │  向量存储     │  │   配置存储        │  │
│  │ SessionManager│  │  LanceDB    │  │   SQLite         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
ai_feishu/
├── src/
│   ├── index.ts              # 后端入口
│   ├── app.ts                # 应用主类
│   ├── core/                  # 核心模块
│   │   ├── config-store.ts    # 配置存储
│   │   ├── encryption.ts      # 加密工具
│   │   ├── kb-folder-manager.ts # 知识库文件夹管理
│   │   ├── logger.ts          # 日志
│   │   ├── mcp-client.ts     # MCP 客户端
│   │   ├── mcp-tool-auth.ts  # MCP 工具认证
│   │   ├── session-manager.ts # 会话管理
│   │   ├── vector-store.ts    # 向量存储
│   │   ├── vector-store-service.ts # 向量服务
│   │   └── ws-manager.ts      # WebSocket 管理
│   ├── routers/               # API 路由
│   │   ├── admin.ts           # 管理接口（模型、配置）
│   │   ├── admin-kb.ts        # 知识库管理接口
│   │   ├── admin-mcp.ts       # MCP 管理接口
│   │   └── callback.ts        # 飞书回调接口
│   ├── services/              # 业务服务
│   │   ├── chunking.ts        # 文档分块
│   │   ├── embedding.ts       # Embedding 服务
│   │   ├── feishu-doc.ts      # 飞书文档服务
│   │   ├── llm-router.ts      # LLM 路由
│   │   ├── rag-pipeline.ts   # RAG 处理管道
│   │   ├── streaming-handler.ts # 流式响应处理
│   │   └── context-manager.ts  # 上下文管理
│   ├── feishu/                # 飞书集成
│   │   ├── card-builder.ts   # 卡片消息构建
│   │   ├── client.ts          # 飞书客户端
│   │   ├── message-handler.ts # 消息处理
│   │   ├── message-service.ts # 消息服务
│   │   └── validator.ts       # 签名验证
│   ├── tools/                 # AI 工具定义
│   │   ├── read_feishu_url.ts # 读取飞书文档
│   │   ├── save_to_new_doc.ts # 保存为新文档
│   │   └── search_local_kb.ts # 搜索本地知识库
│   └── types/                 # 类型定义
│       ├── config.ts         # 配置类型
│       ├── kb.ts             # 知识库类型
│       └── message.ts         # 消息类型
├── admin/                     # React 管理后台
├── data/                      # 本地数据存储
├── tests/                     # 测试文件
├── docs/                      # 开发文档
├── scripts/                   # 运维脚本
├── .env.example               # 环境变量模板
├── package.json               # 依赖声明
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # Vite 构建配置
└── tailwind.config.js         # Tailwind CSS 配置
```

---

## 核心功能

### 飞书原生交互

通过 WebSocket 与飞书服务器建立持久连接，支持接收和发送消息。消息处理流程：

1. 飞书服务器通过 WebSocket 推送消息事件
2. 本地服务验证消息签名
3. 解析消息类型和内容
4. 根据会话状态路由到相应的处理模块
5. 生成响应并通过飞书 API 发送

交互式卡片消息用于模型选择、归档确认等场景。

### 本地向量知识库

基于 LanceDB 构建的嵌入式向量数据库，无需额外部署服务。

**处理流程**：

1. 从飞书云文档同步文件夹
2. 抓取文档内容并进行分块
3. 使用 embedding 模型生成向量
4. 存储到 LanceDB
5. 检索时计算 query 向量并返回相似结果

**配置参数**：

- `KB_CHUNK_SIZE`: 分块大小（默认 500 字符）
- `KB_CHUNK_OVERLAP`: 分块重叠（默认 50 字符）
- `MAX_RETRIEVAL_CHUNKS`: 最大检索块数（默认 5）

### 多模型路由

支持四个模型提供方的统一路由：

| Provider | Base URL | Models |
|----------|----------|--------|
| OpenAI | `https://api.openai.com/v1` | GPT-4, GPT-3.5 |
| Anthropic | `https://api.anthropic.com` | Claude 3.5, Claude 3 |
| Google | `https://generativelanguage.googleapis.com/v1` | Gemini Pro, Gemini Flash |
| Ollama | `http://localhost:11434` | 本地部署模型 |

路由逻辑：

1. 优先使用用户选择的模型
2. 模型不可用时自动切换到默认模型
3. 调用失败时尝试其他可用模型

### MCP 协议集成

通过 MCP (Model Context Protocol) 协议连接飞书官方 MCP Server，扩展 AI 工具能力。

**可用工具**：

- `read_feishu_url`: 读取指定飞书文档内容
- `search_local_kb`: 搜索本地知识库
- `save_to_new_doc`: 将对话内容保存到新的飞书文档

**工具认证管理**：

每个工具可独立启用/禁用，并配置 fallback 方案。

### 流式响应

基于 Server-Sent Events (SSE) 的流式输出设计：

1. AI 模型生成内容后实时推送
2. 前端逐步渲染，提升首字节体验
3. 支持中断和取消

---

## API 文档

### 认证方式

管理接口使用 `X-Admin-API-Key` 请求头进行认证。

```bash
curl -H "X-Admin-API-Key: your-api-key" http://localhost:3000/api/admin/models
```

如果未配置 `ADMIN_API_SECRET` 环境变量，认证会被跳过。

---

### Admin Models API

管理 AI 模型配置。

#### GET /api/admin/models

获取所有已配置模型列表。

**Response**:

```json
{
  "models": [
    {
      "id": "uuid",
      "name": "GPT-4",
      "provider": "openai",
      "modelId": "gpt-4",
      "baseUrl": "https://api.openai.com/v1",
      "isDefault": true,
      "maxTokens": 4096,
      "temperature": 0.7,
      "enabled": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/admin/models/:id

根据 ID 获取单个模型详情。

**Response** (200):

```json
{
  "model": {
    "id": "uuid",
    "name": "GPT-4",
    "provider": "openai",
    "modelId": "gpt-4",
    ...
  }
}
```

**Response** (404):

```json
{
  "success": false,
  "message": "Model not found"
}
```

#### POST /api/admin/models

创建新模型配置。

**Request Body**:

```json
{
  "name": "GPT-4",
  "provider": "openai",
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1",
  "modelId": "gpt-4",
  "isDefault": true,
  "maxTokens": 4096,
  "temperature": 0.7
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | 模型显示名称 |
| provider | string | Yes | 提供方: `openai`, `anthropic`, `gemini`, `ollama` |
| apiKey | string | Yes | API 密钥 |
| baseUrl | string | No | API 基础 URL |
| modelId | string | Yes | 模型 ID |
| isDefault | boolean | No | 是否默认模型 |
| maxTokens | number | No | 最大 token 数 |
| temperature | number | No | 采样温度 |

**Response** (201):

```json
{
  "id": "uuid",
  "success": true
}
```

**Response** (400):

```json
{
  "success": false,
  "message": "Missing required fields: name, provider, apiKey, modelId"
}
```

#### PUT /api/admin/models/:id

更新模型配置。

**Request Body** (partial update supported):

```json
{
  "name": "GPT-4-Turbo",
  "isDefault": true,
  "enabled": false,
  "maxTokens": 8192,
  "temperature": 0.8
}
```

**Response**:

```json
{
  "success": true
}
```

#### DELETE /api/admin/models/:id

删除模型配置。

**Response**:

```json
{
  "success": true
}
```

---

### Admin Config API

#### GET /api/admin/config

获取系统配置。

**Response**:

```json
{
  "feishu": {
    "appId": "cli_xxx",
    "appSecret": "***"
  },
  "mcp": {
    "serverUrl": "http://localhost:3001",
    "fallbackEnabled": true
  }
}
```

#### PUT /api/admin/config/feishu

更新飞书配置。

**Request Body**:

```json
{
  "appId": "cli_xxxxxxxxxxxxxx",
  "appSecret": "new-secret"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Feishu config updated. Restart the app for changes to take effect."
}
```

---

### Admin KB API

管理知识库文件夹和同步。

#### GET /api/admin/kb/folders

获取所有已配置的知识库文件夹。

**Response**:

```json
{
  "folders": [
    {
      "id": "uuid",
      "name": "产品文档",
      "url": "https://.feishu.cn/folder/xxx",
      "folderToken": "xxx",
      "lastSyncAt": "2024-01-01T00:00:00.000Z",
      "lastSyncDocCount": 42,
      "syncEnabled": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/admin/kb/folders

添加新的知识库文件夹。

**Request Body**:

```json
{
  "name": "产品文档",
  "url": "https://feishu.cn/folder/xxx"
}
```

**Response** (201):

```json
{
  "id": "uuid",
  "success": true
}
```

#### DELETE /api/admin/kb/folders/:id

移除知识库文件夹。

**Response**:

```json
{
  "success": true
}
```

#### POST /api/admin/kb/sync

触发知识库同步。

**Request Body** (optional):

```json
{
  "folderId": "uuid"
}
```

不提供 `folderId` 时同步所有已启用同步的文件夹。

**Response**:

```json
{
  "success": true,
  "message": "Synced 15 documents from 3 folders"
}
```

#### GET /api/admin/kb/stats

获取知识库统计信息。

**Response**:

```json
{
  "totalChunks": 1234,
  "totalDocuments": 56,
  "storageSize": "1.23MB",
  "lastSyncAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Admin MCP API

管理 MCP 协议集成和工具配置。

#### GET /api/admin/mcp/status

获取 MCP 连接状态。

**Response**:

```json
{
  "connected": true,
  "fallbackEnabled": true,
  "serverUrl": "http://localhost:3001"
}
```

#### GET /api/admin/mcp/tools

获取所有 MCP 工具列表。

**Response**:

```json
{
  "tools": [
    {
      "name": "read_feishu_url",
      "description": "读取飞书文档内容",
      "enabled": true,
      "fallbackEnabled": true,
      "fallbackMethod": "direct",
      "availableInMCP": true
    }
  ]
}
```

#### PUT /api/admin/mcp/tools/:name

更新工具启用状态。

**Request Body**:

```json
{
  "enabled": false
}
```

**Response**:

```json
{
  "success": true
}
```

**Response** (404):

```json
{
  "success": false,
  "message": "Tool not found: read_feishu_url"
}
```

#### GET /api/admin/mcp/health

MCP 健康检查。

**Response**:

```json
{
  "healthy": true,
  "connected": true,
  "toolsLoaded": 3
}
```

---

### Callback API

#### POST /api/callback/feishu

飞书事件回调端点。接收并验证飞书推送的事件，包括消息接收和卡片交互。

**Headers**:

- `X-Lark-Request-Timestamp`: 请求时间戳
- `X-Lark-Request-Signature`: 签名

**Response**:

```json
{
  "code": 0,
  "msg": "success"
}
```

#### GET /api/callback/health

健康检查端点。

**Response**:

```json
{
  "status": "ok"
}
```

---

### System Endpoints

#### GET /health

系统健康检查。

**Response**:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "wsConnected": false,
  "mcpConnected": false,
  "vectorDbStatus": "ready",
  "currentModel": "GPT-4"
}
```

---

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行性能测试
npm run test:performance

# 负载测试（需要服务运行）
npm run test:load
```

### 性能分析

```bash
# 分析响应时间
npm run analyze:perf
```

---

## 环境变量参考

完整的环境变量列表请参考 `.env.example` 文件。

### 必需变量

| Variable | Description |
|----------|-------------|
| `FEISHU_APP_ID` | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret |

### 可选变量

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | 服务端口 |
| `ADMIN_API_SECRET` | - | 管理接口认证密钥 |
| `OPENAI_API_KEY` | - | OpenAI API 密钥 |
| `ANTHROPIC_API_KEY` | - | Anthropic API 密钥 |
| `GEMINI_API_KEY` | - | Google Gemini API 密钥 |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama 服务地址 |
| `EMBEDDING_PROVIDER` | `openai` | Embedding 提供方 |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding 模型 |
| `EMBEDDING_DIMENSION` | `1536` | Embedding 维度 |
| `KB_CHUNK_SIZE` | `500` | 知识库分块大小 |
| `KB_CHUNK_OVERLAP` | `50` | 知识库分块重叠 |
| `KB_SYNC_INTERVAL` | `3600` | 知识库同步间隔（秒） |

---

## License

MIT
