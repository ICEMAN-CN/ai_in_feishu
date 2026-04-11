# 【正式版PRD】AI_Feishu - 飞书原生本地 AI 知识库

**文档版本**：v1.1 正式版（修订版）  
**撰写日期**：2026-04-11  
**修订日期**：2026-04-11  
**产品负责人**：[待定]  
**架构师**：[待定]  
**状态**：正式发布  

---

## 一、产品概述

### 1.1 产品定位

| 属性 | 内容 |
|------|------|
| **产品名称** | AI_Feishu（飞书原生 AI 知识库） |
| **产品形态** | B/S 架构本地私有化部署（Phase 1）+ Tauri 桌面端（Phase 2） |
| **一句话定义** | 100%依托飞书平台的轻量级、本地化多模型 AI 助理与知识库引擎 |
| **核心差异化** | 消除"多AI工具切换"与"飞书文档搬运"的摩擦力；数据与向量库100%本地化运行 |
| **真理源设定** | 飞书IM为唯一交互入口；飞书云文档为唯一高质量知识源；本地只保留极简配置与无头向量库 |
| **MVP范围** | 单企业自用场景，多租户延后Phase 2 |

### 1.2 核心价值主张

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AI_Feishu 价值金字塔                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         ▲ 极致体验                                   │
│                        ╱ ╲ 飞书原生交互 / 流式输出                   │
│                       ╱   ╲                                        │
│                      ╱─────╲                                       │
│                     ╱ 效率提升 ╲                                     │
│                    ╱ 多模型路由 ╲                                    │
│                   ╱   Tool Calling  ╲                                │
│                  ╱─────────────────╲                                │
│                 ╱    数据隐私底座    ╲                               │
│                ╱ 100%本地化部署 0云依赖╲                              │
│               ╱────────────────────────╲                            │
│              ╱        轻量架构           ╲                           │
│             ╱  LanceDB + SQLite 无独立进程╲                          │
│            ╱──────────────────────────────╲                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 目标用户画像

| 用户类型 | 特征 | 核心诉求 |
|---------|------|---------|
| **飞书重度用户** | 日常协作依赖飞书文档、会议纪要 | 快速检索历史知识、提炼讨论结论 |
| **技术团队负责人** | 管理多模型API、关注数据安全 | 统一配置管控、本地化隐私保障 |
| **知识工作者** | 需要AI辅助阅读、总结、归档 | 无缝文档问答、自动沉淀成果 |
| **创业公司/中小企业** | 预算有限、注重数据主权 | 低成本私有化部署、无需云服务 |

### 1.4 成功指标 (KPIs)

| 指标类别 | 指标名称 | 目标值 | 衡量方式 |
|---------|---------|-------|---------|
| **用户体验** | 对话响应时长（P50） | ≤2s | 后端日志打点 |
| **用户体验** | 流式输出首字时间 | ≤500ms | 后端日志打点 |
| **功能可用性** | 消息发送成功率 | ≥99.5% | 飞书回调日志 |
| **功能可用性** | 知识库检索召回率 | ≥85% | 人工评测集 |
| **系统稳定性** | WebSocket连接稳定性 | ≥99.9% | 心跳监控 |
| **系统稳定性** | MCP服务可用性 | ≥99% | 健康检查接口 |
| **业务指标** | 人均日对话轮次 | ≥10轮 | 消息统计 |
| **业务指标** | 知识库文档覆盖率 | ≥90% | 文档同步记录 |

### 1.5 竞品分析

| 竞品 | 优点 | 缺点 | AI_Feishu差异化 |
|------|------|------|----------------|
| **AnythingLLM** | 本地向量库成熟 | 无飞书原生集成、界面简陋 | 飞书深度集成、MCP协议 |
| **LobeChat** | 多模型支持、流式UI好 | 无本地部署、依赖云端 | 100%本地化、数据不出局 |
| **FastGPT** | 功能全面 | 架构重、需 Postgres/Redis | 轻量无独立进程 |
| **飞书AI助手** | 官方集成 | 功能有限、无知识库自定义 | 可控的知识库、灵活模型 |

---

## 二、总体架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI_Feishu 总体架构                              │
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

### 2.2 技术架构决策

| 层级 | 技术选型 | 版本锁定 | 选型理由 | 约束条件 |
|------|---------|---------|---------|---------|
| **运行时** | Node.js | 20.11.0 (LTS) | 成熟生态、支持WebSocket持久连接 | 禁止Serverless方案 |
| **后端框架** | Hono.js | ^4.0.0 | 轻量、类型安全、比Express快3x | 需兼容REST API规范 |
| **飞书SDK** | @larksuiteoapi/node-sdk | ^1.5.0 | 官方维护、WebSocket支持 | 仅用于长连接和回调 |
| **AI路由** | @ai-sdk/sdk | ^0.10.0 | 多厂商统一抽象、Tool Calling标准化 | 替代自研路由层 |
| **向量库** | LanceDB | ^0.4.0 | 无头部署、.lance文件库、Rust底层 | 禁止使用Milvus/Pinecone |
| **关系库** | better-sqlite3 | ^9.0.0 | 嵌入式、零配置、无独立进程 | 禁止使用Postgres/Mongo |
| **前端框架** | React | 18.2.0 | CSR单页应用、方便Tauri打包 | 禁止Next.js SSR |
| **打包工具** | Vite | 5.0.0 | 极速HMR，与React完美协同 | - |
| **UI组件** | Tailwind CSS + shadcn/ui | shadcn/ui ^0.5.0 | LobeChat同款、现代感强 | 需定制飞书主题色 |
| **状态管理** | Zustand | ^4.4.0 | 极简、与React完美协同 | 禁止Redux |
| **桌面端** | Tauri | 2.0.0 | Rust底层、<20MB包体、内存占用小 | Phase 2规划 |
| **文档分块** | @langchain/core | ^0.1.0 | TextSplitter工具，轻量使用 | 仅用TextSplitter，不用链式 |

### 2.3 系统边界约束（铁律）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            系统边界约束 (Phase 1 MVP)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ 允许 (MVP范围内)                                                         │
│  ────────────────────────────────────────────────────────────────────────   │
│  • 飞书IM私聊/群聊作为唯一用户交互入口                                        │
│  • Web Admin UI仅做配置和监控，禁止聊天                                      │
│  • 本地LanceDB向量库存储知识库                                               │
│  • SQLite存储系统配置                                                       │
│  • MCP协议对接飞书官方能力                                                   │
│  • 多模型路由（OpenAI/Anthropic/Gemini/Ollama）                              │
│  • 创建新的飞书云文档（只写新建，不修改已有文档）                                │
│  • 单企业自用（多租户延后Phase 2）                                            │
│                                                                             │
│  ❌ 禁止 (Phase 1 MVP明确排除)                                               │
│  ────────────────────────────────────────────────────────────────────────   │
│  • Web端聊天界面（禁止双端同步复杂性）                                        │
│  • 飞书聊天记录自动向量化（防止脏数据污染知识库）                              │
│  • 修改/覆盖已有飞书文档（防止协同冲突）                                       │
│  • 复杂知识图谱可视化（Karpathy Graphify延后Phase 2）                         │
│  • 多Agent工作流编排（仅支持单步Tool Calling决策）                             │
│  • 使用Feishu CLI（Node.js子进程性能损耗）                                   │
│  • 任何云端数据库依赖（Postgres/Redis/Milvus云版）                            │
│  • 多租户场景（Phase 2考虑）                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 技术风险提示

> ⚠️ **MCP协议风险**: MCP协议目前仍在快速演进中(0.x版本)。飞书官方MCP Server可能存在：
> - API Breaking Changes风险
> - 文档不完善
> - 能力限制（如不支持某些文档类型）
>
> **缓解策略**: 
> 1. 保留原生 `@larksuiteoapi/node-sdk` API作为MCP的降级方案
> 2. 在config中预留 `MCP_FALLBACK_ENABLED=true` 开关
> 3. 关键Tool需同时实现MCP和原生API两套调用路径

### 2.5 上下文管理策略

| 策略 | 说明 | 配置项 |
|-----|------|-------|
| 单消息限制 | 最大10,000字符，超出截断并提示 | `MAX_MESSAGE_LENGTH=10000` |
| Thread历史保留 | 保留最近N条消息（默认20轮） | `THREAD_MESSAGE_LIMIT=20` |
| Token预算 | 预留20%给系统prompt和检索结果 | 系统自动计算 |
| 检索结果注入 | 最多注入5个相关Chunk | `MAX_RETRIEVAL_CHUNKS=5` |

### 2.6 多租户支持说明

| 场景 | 处理方式 | 当前MVP |
|-----|---------|---------|
| 单企业自用 | tenant_key固定，配置共用 | ✅ 支持 |
| 多企业接入 | 需按tenant_key隔离配置和向量库 | ❌ 延后Phase 2 |

---

### 2.7 目录结构

```
ai_feishu/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .env.example                    # 环境变量模板
│
├── src/
│   ├── index.ts                    # 后端入口（Node.js进程）
│   ├── app.ts                      # Hono.js 应用实例
│   │
│   ├── core/                       # 核心引擎模块
│   │   ├── ws-manager.ts           # WebSocket连接管理器
│   │   ├── mcp-client.ts           # MCP Client模块
│   │   ├── session-manager.ts      # 会话管理器（Thread绑定模型）
│   │   ├── config-store.ts         # SQLite配置存储
│   │   └── vector-store.ts         # LanceDB向量存储
│   │
│   ├── routers/                    # Hono.js 路由
│   │   ├── admin.ts                # 管理后台API
│   │   ├── health.ts               # 健康检查API
│   │   └── callback.ts             # 飞书回调API
│   │
│   ├── services/                   # 业务服务层
│   │   ├── llm-router.ts           # 大模型路由服务
│   │   ├── rag-pipeline.ts         # RAG流水线
│   │   ├── chunking.ts             # 文档分块服务
│   │   ├── embedding.ts            # 向量化服务
│   │   └── feishu-doc.ts          # 飞书文档操作服务
│   │
│   ├── tools/                      # Tool Calling定义
│   │   ├── index.ts                # 工具注册入口
│   │   ├── read_feishu_url.ts      # 即时链接阅读
│   │   ├── search_local_kb.ts      # 历史知识检索
│   │   └── save_to_new_doc.ts      # 对话成果归档
│   │
│   ├── feishu/                     # 飞书集成
│   │   ├── client.ts               # 飞书SDK客户端
│   │   ├── card-builder.ts         # 飞书卡片构建器
│   │   └── message-handler.ts     # 消息处理器
│   │
│   └── types/                      # TypeScript类型定义
│       ├── config.ts               # 配置类型
│       ├── session.ts              # 会话类型
│       └── message.ts              # 消息类型
│
├── admin/                          # 前端控制台 (React)
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # 状态监控台
│   │   │   ├── Settings.tsx        # 全局环境配置
│   │   │   ├── Models.tsx          # 模型路由管理
│   │   │   └── KnowledgeBase.tsx   # 知识库绑定
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Nav.tsx
│   │   │   └── ...
│   │   ├── stores/
│   │   │   └── useConfigStore.ts   # Zustand状态
│   │   └── lib/
│   │       └── api.ts              # API调用封装
│   └── package.json
│
├── data/                           # 数据目录
│   ├── config.db                   # SQLite数据库
│   └── vectors/                    # LanceDB向量库
│       └── *.lance
│
├── scripts/                        # 运维脚本
│   ├── init-db.ts                  # 数据库初始化
│   └── sync-kb.ts                  # 知识库同步
│
└── tests/                          # 测试目录
    ├── unit/
    ├── integration/
    └── e2e/
```

### 2.8 环境变量配置

```bash
# .env.example

# ========== 飞书配置 ==========
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
FEISHU_BOT_NAME=AI_Feishu

# ========== MCP配置 ==========
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_TOKEN=
MCP_FALLBACK_ENABLED=true          # MCP不可用时是否降级到原生API

# ========== LLM配置 (示例) ==========
# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxx
ANTHROPIC_BASE_URL=https://api.anthropic.com

# Google Gemini
GEMINI_API_KEY=xxxxxxxxxxxxxx

# Ollama (本地)
OLLAMA_BASE_URL=http://localhost:11434

# ========== Embedding配置 ==========
EMBEDDING_PROVIDER=openai   # openai / ollama / local
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# ========== 系统配置 ==========
PORT=3000
ADMIN_PORT=3001
LOG_LEVEL=info
NODE_ENV=development
ADMIN_API_SECRET=           # Admin API访问密钥（必填）

# ========== 知识库配置 ==========
KB_FOLDER_URLS=              # 逗号分隔的飞书文件夹URL
KB_SYNC_INTERVAL=3600       # 同步间隔（秒）
KB_CHUNK_SIZE=500           # 分块大小（token）
KB_CHUNK_OVERLAP=50         # 分块重叠（token）
THREAD_MESSAGE_LIMIT=20     # Thread内保留消息轮数
MAX_RETRIEVAL_CHUNKS=5      # 最多注入检索结果数

# ========== 安全配置 ==========
ALLOWED_FEISHU_USERS=       # 允许使用的用户ID，逗号分隔，为空则允许所有人
ENCRYPTION_KEY=             # AES-256-GCM加密密钥（32字节hex）

# ========== 存储配置 ==========
DATA_DIR=./data
VECTOR_DB_PATH=./data/vectors
SQLITE_PATH=./data/config.db
```

---

## 三、功能规格

### 3.1 功能优先级矩阵

| 优先级 | 功能模块 | 功能点 | 重要性 | 复杂度 | 依赖关系 | 备注 |
|-------|---------|-------|--------|--------|---------|------|
| **P0** | 飞书消息通道 | 消息接收与发送 | 必须有 | 低 | 无 | MVP核心 |
| **P0** | 飞书消息通道 | WebSocket长连接 | 必须有 | 中 | 无 | 飞书SDK |
| **P0** | 模型路由 | 多模型配置管理 | 必须有 | 中 | SQLite | MVP核心 |
| **P0** | 模型路由 | 流式响应输出 | 必须有 | 中 | 飞书消息通道 | SSE→飞书 |
| **P1** | MCP集成 | 官方MCP Server对接 | 必须有 | 高 | 飞书消息通道 | 核心差异化 |
| **P1** | 卡片交互 | 会话启动卡片 | 必须有 | 中 | 飞书消息通道 | 体验保障 |
| **P1** | RAG Pipeline | 文档同步与向量化 | 必须有 | 高 | 飞书MCP | 核心价值 |
| **P2** | Tool Calling | read_feishu_url | 应该有 | 中 | MCP集成 | 文档问答 |
| **P2** | Tool Calling | search_local_kb | 应该有 | 中 | RAG Pipeline | 知识检索 |
| **P2** | Tool Calling | save_to_new_doc | 应该有 | 中 | MCP集成 | 成果归档 |
| **P2** | Admin控制台 | 环境配置面板 | 应该有 | 中 | SQLite | 运维必备 |
| **P2** | Admin控制台 | 状态监控面板 | 应该有 | 低 | WebSocket | 运维必备 |
| **P3** | Thread管理 | 话题级隔离 | 可以有 | 中 | 消息通道 | 上下文隔离 |
| **P3** | 知识库绑定 | 多文件夹配置 | 可以有 | 中 | RAG Pipeline | 扩展性 |

### 3.2 P0 功能详细规格

---

#### 3.2.1 飞书消息通道 (Feishu Message Channel)

**功能描述**  
建立与飞书平台的稳定WebSocket长连接，实现消息的接收、解析、路由和发送。

**实现方式**  
使用 `@larksuiteoapi/node-sdk` 的 WebSocket 模式，维持与飞书服务器的持久连接。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| MSG-001 | 支持接收飞书私聊消息 | 用户向机器人发送消息，服务器能在<500ms内收到事件推送 |
| MSG-002 | 支持接收飞书群聊@消息 | 群内@机器人，机器人能收到并正确解析消息内容 |
| MSG-003 | 支持发送飞书文本消息 | 机器人能回复文本消息，支持Markdown渲染 |
| MSG-004 | 支持发送交互卡片 | 机器人能下发带按钮、下拉的交互卡片 |
| MSG-005 | WebSocket断线自动重连 | 网络波动后能自动重连，重连间隔指数退避 |
| MSG-006 | 消息签名校验 | 开启签名校验后能正确验证消息合法性 |
| MSG-007 | 消息去重 | 同一message_id不重复处理 |
| MSG-008 | 高并发消息处理 | 支持10+用户同时对话，无消息丢失 |

**技术实现细节**

```typescript
// WebSocket连接配置
interface FeishuWSConfig {
  appId: string;
  appSecret: string;
  loggerLevel: 'debug' | 'info' | 'warn' | 'error';
  reconnectInterval: number;  // 默认: 5000ms
  maxReconnectAttempts: number; // 默认: 10
}

// 消息事件类型
type FeishuMessageEvent = {
  header: {
    event_id: string;
    event_type: 'im.message.receive_v1';
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: {
    sender: {
      sender_id: { open_id: string };
      sender_type: 'user' | 'bot';
    };
    receiver: {
      receiver_id: { open_id: string };
      receiver_type: 'user' | 'bot';
    };
    message: {
      message_id: string;
      root_id: string;       // Thread根消息ID（用于Thread绑定）
      parent_id: string;      // 父消息ID（空表示根消息）
      create_time: string;
      chat_id: string;
      chat_type: 'p2p' | 'group';
      message_type: 'text' | 'post' | 'interactive';
      content: string;  // JSON string
    };
  };
};

// Thread模型说明：
// - Thread = 以 root_id 为根的消息树
// - 同一 root_id 下的所有消息共享同一个AI模型
// - root_id 为空时表示这是新的Thread的第一条消息
```

**异常处理逻辑**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WebSocket 异常处理流程                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [连接建立] ──成功──▶ [正常收发消息]                                          │
│      │                                                                     │
│      │ 失败                                                                 │
│      ▼                                                                    │
│  [错误类型判断]                                                             │
│      │                                                                     │
│      ├─── 401 Unauthorized ──▶ [刷新App Credential] ──▶ [重试连接]         │
│      │                                                                   │  │
│      ├─── 403 Forbidden ─────▶ [记录告警日志] ──▶ [终止连接,需人工介入]     │  │
│      │                                                                   │  │
│      ├─── 429 Rate Limited ──▶ [指数退避等待] ──▶ [重试]                   │  │
│      │                                                                   │  │
│      ├─── 1000 Network Error ─▶ [等待重连] ──▶ [指数退避: 5s,10s,20s...]    │  │
│      │                                                                   │  │
│      └─── Unknown Error ───▶ [记录错误日志] ──▶ [标准重连流程]               │  │
│                                                                             │
│  [重连成功] ──▶ [恢复消息收发]                                               │
│      │                                                                     │
│      │ 超过最大重试次数                                                      │
│      ▼                                                                     │
│  [触发告警通知] ──▶ [记录持久化错误]                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**流程示意图**

```
用户 ──发送消息──▶ 飞书服务器 ──WebSocket推送──▶ 本地引擎
                                                      │
                                                      ▼
                                              [消息解析与去重]
                                                      │
                                                      ▼
                                              [Session路由分发]
                                                      │
                              ┌────────────────────────┼────────────────────────┐
                              ▼                        ▼                        ▼
                        [新Thread?]              [已有Thread]            [管理命令?]
                              │                        │                        │
                              ▼                        ▼                        ▼
                      [下发启动卡片]           [路由到对应模型]          [执行管理操作]
                              │                        │                        │
                              └────────────────────────┼────────────────────────┘
                                                      │
                                                      ▼
                                              [流式响应生成]
                                                      │
                                                      ▼
                                              [更新飞书消息卡片]
                                                      │
                                                      ▼
                                                用户收到回复
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-MSG-001 | 私聊消息接收 | 用户发送"你好" | 服务器收到event | 手动测试 |
| TC-MSG-002 | 消息去重 | 同一message_id发送2次 | 仅处理1次 | 自动化mock |
| TC-MSG-003 | 签名校验开启 | 非法签名消息 | 返回401， reject | 安全测试 |
| TC-MSG-004 | 签名校验关闭 | 任意消息 | 正常处理 | 配置测试 |
| TC-MSG-005 | 断线重连 | 断开网络30s后恢复 | 自动重连成功 | 网络模拟 |
| TC-MSG-006 | 高并发 | 10用户同时发送消息 | 全部正确处理 | 压力测试 |

---

#### 3.2.2 模型路由管理 (Multi-Model Routing)

**功能描述**  
支持配置多个大模型（OpenAI、Anthropic、Gemini、Ollama），并通过Vercel AI SDK实现统一路由。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| LLM-001 | 多模型配置存储 | SQLite存储模型配置，断电重启不丢失 |
| LLM-002 | 默认模型设置 | Admin可设置全局默认模型 |
| LLM-003 | 模型列表查询 | API返回当前已配置模型列表 |
| LLM-004 | 支持OpenAI | 支持GPT-4o/GPT-4-turbo等 |
| LLM-005 | 支持Anthropic | 支持Claude-3.5/Claude-3等 |
| LLM-006 | 支持Gemini | 支持Gemini-1.5-Pro等 |
| LLM-007 | 支持Ollama | 支持本地模型 llama3/qwen2 等 |
| LLM-008 | 模型密钥加密 | API Key使用AES-256-GCM加密存储 |
| LLM-009 | 流式响应 | SSE格式流式输出，支持中断 |

**数据模型**

```typescript
// SQLite: models 表
interface ModelConfig {
  id: string;              // UUID
  name: string;            // 模型名称，如 "GPT-4o"
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  apiKeyEncrypted: string; // AES-256-GCM加密存储
  baseUrl: string;         // API地址
  modelId: string;         // 厂商模型ID
  isDefault: boolean;      // 是否默认
  maxTokens: number;       // 最大token
  temperature: number;     // 温度参数
  enabled: boolean;       // 是否启用
  createdAt: string;
  updatedAt: string;
}

// SQLite: sessions 表
// 注意：threadId 对应飞书消息的 root_id
interface Session {
  id: string;               // UUID
  threadId: string;         // 飞书 root_id（Thread根消息ID）
  p2pId: string;           // 私聊会话ID
  modelId: string;         // 绑定的模型ID
  systemPrompt: string;    // 定制系统提示词
  messageCount: number;    // 消息计数
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-LLM-001 | 配置新模型 | 添加OpenAI API配置 | 保存成功，列表显示 | 手动测试 |
| TC-LLM-002 | 设置默认模型 | 切换默认模型 | 新对话使用新默认 | 手动测试 |
| TC-LLM-003 | 模型调用 | 发送对话请求 | 正确模型响应 | 集成测试 |
| TC-LLM-004 | API Key加密 | 数据库文件查看 | Key为密文 | 安全测试 |
| TC-LLM-005 | Ollama本地 | 调用本地模型 | 正常响应 | 网络隔离测试 |
| TC-LLM-006 | 模型切换 | Thread内切换模型 | 拒绝操作，保持原模型 | 边界测试 |

---

### 3.3 P1 功能详细规格

---

#### 3.3.1 MCP集成 (MCP Protocol Integration)

**功能描述**  
通过MCP Client模块对接飞书官方MCP Server，获取标准化的文档读写能力。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| MCP-001 | MCP Server连接 | 能连接到飞书官方MCP Server |
| MCP-002 | 工具透传 | MCP工具能透传给Vercel AI SDK |
| MCP-003 | read_document | 能读取飞书文档并转换为Markdown |
| MCP-004 | search_wiki_or_drive | 能进行飞书全局搜索 |
| MCP-005 | create_document | 能在指定目录创建新文档 |
| MCP-006 | MCP配置管理 | Admin面板可配置MCP参数 |
| MCP-007 | 工具授权开关 | 可视化开关控制AI可调用哪些工具 |
| MCP-008 | 连接健康检测 | 能检测MCP Server可用性 |
| MCP-009 | 降级策略 | MCP不可用时自动降级到原生API |

**MCP工具映射表**

| 业务场景 | 官方MCP工具 | 原生API降级 | 权限要求 | 开关默认 |
|---------|------------|-----------|---------|---------|
| 即时文档阅读 | read_document | feishu.docx.document.get | 文档读取权限 | ✅ 开启 |
| 全局知识搜索 | search_wiki_or_drive | feishu.search | 搜索权限 | ✅ 开启 |
| 创建新文档 | create_document | feishu.docx.document.create | 文档创建权限 | ✅ 开启 |
| 修改已有文档 | update_document | (无降级) | 文档编辑权限 | ❌ 关闭 |
| 发送消息 | send_message | feishu.im.message.create | 消息发送权限 | ❌ 关闭 |
| 创建群聊 | create_chat | feishu.im.chat.create | 群管理权限 | ❌ 关闭 |

**技术实现**

```typescript
// MCP Client配置
interface MCPClientConfig {
  serverUrl: string;
  serverToken?: string;
  timeout: number;  // 默认: 30000ms
  retryAttempts: number;  // 默认: 3
  fallbackEnabled: boolean;  // 降级开关
}

// MCP工具定义
interface MCPTool {
  name: string;           // 'read_document'
  description: string;
  inputSchema: {
    type: 'object';
    properties: {
      document_id: { type: 'string' };
    };
    required: ['document_id'];
  };
  fallbackMethod?: string;  // 原生API降级方法
}

// 降级调用示例
async function readDocumentWithFallback(documentId: string): Promise<string> {
  try {
    // 优先尝试MCP
    const mcpClient = getMCPClient();
    if (mcpClient.isConnected() && mcpFallbackEnabled) {
      return await mcpClient.callTool('read_document', { document_id: documentId });
    }
  } catch (error) {
    console.warn('MCP调用失败，降级到原生API:', error);
  }
  
  // 降级到原生API
  return await feishuNativeAPI.readDocument(documentId);
}
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-MCP-001 | MCP连接 | 启动服务 | 成功连接到MCP Server | 日志验证 |
| TC-MCP-002 | 文档读取 | AI调用read_document | 返回Markdown内容 | 集成测试 |
| TC-MCP-003 | 文档创建 | AI调用create_document | 飞书目录新增文档 | 手动验证 |
| TC-MCP-004 | 权限关闭 | 关闭create权限后AI尝试创建 | 返回权限不足提示 | 边界测试 |
| TC-MCP-005 | MCP降级 | MCP Server宕机 | 自动切换到原生API | 故障测试 |
| TC-MCP-006 | MCP恢复 | MCP Server恢复 | 自动切回MCP | 恢复测试 |

---

#### 3.3.2 卡片交互 (Interactive Cards)

**功能描述**  
通过飞书交互卡片实现会话启动、模型选择、归档确认等交互场景。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| CARD-001 | 新建对话卡片 | 点击菜单下发启动卡片，包含模型选择下拉 |
| CARD-002 | 模型下拉 | 动态加载已配置模型列表 |
| CARD-003 | 流式消息卡片 | 支持在同一卡片上流式更新内容 |
| CARD-004 | Markdown渲染 | 支持代码块、加粗、斜体等格式 |
| CARD-005 | 归档确认卡片 | 对话结束询问是否归档 |
| CARD-006 | 文档链接卡片 | 回复新文档时附带链接卡片 |

**飞书卡片JSON结构（官方标准格式）**

```typescript
// 会话启动卡片 - 飞书官方 card 格式
const sessionStarterCard = {
  schema: '2.0',
  card: {
    header: {
      title: {
        tag: 'plain_text',
        content: '🆕 新建 AI 对话'
      },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '选择一个AI引擎开始对话'
        }
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'select_static',
            placeholder: {
              tag: 'plain_text',
              content: '选择 AI 引擎'
            },
            options: [
              { label: 'GPT-4o', value: 'gpt-4o' },
              { label: 'Claude-3.5 Sonnet', value: 'claude-3.5-sonnet' },
              { label: 'Gemini-1.5-Pro', value: 'gemini-1.5-pro' },
              { label: 'Llama-3 (本地)', value: 'llama-3' }
            ],
            action_id: 'model_select'
          }
        ]
      },
      {
        tag: 'hr'
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '🚀 开始对话'
            },
            type: 'primary',
            action_id: 'start_conversation'
          }
        ]
      }
    ]
  }
};

// 流式响应卡片 - 支持逐步更新
const streamingCardTemplate = {
  schema: '2.0',
  card: {
    header: {
      title: {
        tag: 'plain_text',
        content: '🤖 Claude-3.5 Sonnet'
      },
      template: 'grey'
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '正在思考...'  // 初始内容，后续通过patch更新
        },
        id: 'response_content'
      },
      {
        tag: 'hr',
        id: 'divider'
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: '流式输出中...'
          }
        ]
      }
    ]
  }
};

// 归档确认卡片
const archiveConfirmCard = {
  schema: '2.0',
  card: {
    header: {
      title: {
        tag: 'plain_text',
        content: '💾 归档确认'
      },
      template: 'green'
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '是否将当前对话归档为飞书文档？'
        }
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '📄 完整归档'
            },
            type: 'primary',
            action_id: 'archive_full'
          },
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '📝 摘要归档'
            },
            action_id: 'archive_summary'
          },
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '📋 行动项归档'
            },
            action_id: 'archive_action_items'
          },
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '❌ 取消'
            },
            action_id: 'archive_cancel'
          }
        ]
      }
    ]
  }
};

// 文档链接卡片
const docLinkCard = (docTitle: string, docUrl: string) => ({
  schema: '2.0',
  card: {
    header: {
      title: {
        tag: 'plain_text',
        content: '✅ 文档已创建'
      },
      template: 'green'
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**${docTitle}**`
        }
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '📄 查看文档'
            },
            type: 'primary',
            action_id: 'open_doc',
            url: docUrl
          }
        ]
      }
    ]
  }
});
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-CARD-001 | 启动卡片 | 点击菜单 | 下发正确格式的卡片 | 手动测试 |
| TC-CARD-002 | 模型列表 | 打开下拉框 | 显示已配置的模型 | 手动测试 |
| TC-CARD-003 | Markdown渲染 | 回复包含代码块 | 飞书正确渲染高亮 | 手动测试 |
| TC-CARD-004 | 流式更新 | 发送长请求 | 卡片内容逐步更新 | 手动测试 |

---

#### 3.3.3 RAG流水线 (Local RAG Pipeline)

**功能描述**  
实现文档的定时同步、分块、向量化存储和语义检索。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| RAG-001 | 文件夹配置 | 支持配置多个飞书文件夹URL |
| RAG-002 | 增量同步 | 仅同步新增/修改的文档 |
| RAG-003 | 定时全量同步 | 可配置同步间隔 |
| RAG-004 | 文档清洗 | 提取纯文本，移除无关格式 |
| RAG-005 | 语义分块 | 按段落/句子分块，控制chunk大小 |
| RAG-006 | 向量化 | 调用Embedding模型生成向量 |
| RAG-007 | 向量存储 | 存入LanceDB，包含metadata |
| RAG-008 | 语义检索 | Top-K召回，支持重排序 |
| RAG-009 | 混合检索 | MCP搜索 + 本地向量检索融合 |

**LanceDB数据模型**

```typescript
// 向量库Schema - LanceDB兼容格式
import { lance, Schema, Utf8, Float32, Int32, Int64 } from 'vectordb';

const chunkSchema = new Schema({
  id: new Int32(),               // 自增ID
  doc_id: new Utf8(),            // 源文档ID
  doc_title: new Utf8(),         // 源文档标题
  doc_url: new Utf8(),           // 飞书文档URL
  folder_id: new Utf8(),         // 所属文件夹ID
  text_chunk: new Utf8(),        // 分块文本内容
  token_count: new Int32(),      // token数量
  vector: new Float32(),         // 向量数组 (需指定dimension)
  doc_updated_at: new Int64(),   // 文档更新时间戳（用于增量同步）
  chunk_index: new Int32(),      // 块在文档中的索引
  created_at: new Int64(),       // 创建时间戳
  sync_status: new Utf8(),       // 'pending' | 'synced' | 'failed'
});

// LanceDB表配置
interface VectorTableConfig {
  tableName: 'document_chunks';
  dimension: 1536;  // text-embedding-3-small 为1536维
  indexType: 'IVF_PQ';  // IVF_PQ 或 HNSW
  metricType: 'L2';  // L2距离或Cosine
}

// SQLite: kb_folders 表
interface KBFolder {
  id: string;
  name: string;
  url: string;
  folderToken: string;    // 飞书文件夹token
  lastSyncAt: string;
  lastSyncDocCount: number;  // 上次同步文档数
  syncEnabled: boolean;
  createdAt: string;
}
```

**分块策略**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           文档分块策略                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [原始文档] ──▶ [标题 + 元数据提取] ──▶ [纯文本清洗]                           │
│                                              │                               │
│                                              ▼                               │
│                                    [LangChain TextSplitter]                  │
│                                              │                               │
│                         ┌────────────────────┼────────────────────┐         │
│                         ▼                    ▼                    ▼         │
│                   [固定分块]           [段落分块]            [语义分块]       │
│                   500 tokens           按段落切分          按句子嵌入       │
│                   50 overlap           智能合并短段落        段落级切分      │
│                         │                    │                    │         │
│                         └────────────────────┼────────────────────┘         │
│                                              │                               │
│                                              ▼                               │
│                                    [过滤短块 < 100 tokens]                   │
│                                              │                               │
│                                              ▼                               │
│                                    [调用Embedding API]                       │
│                                              │                               │
│                                              ▼                               │
│                                    [写入LanceDB]                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-RAG-001 | 单文档同步 | 配置1个文档URL | 文档内容入库 | 手动测试 |
| TC-RAG-002 | 文件夹同步 | 配置文件夹URL | 文件夹下所有文档入库 | 手动测试 |
| TC-RAG-003 | 增量同步 | 修改文档后同步 | 仅同步变更部分 | 版本对比 |
| TC-RAG-004 | 分块大小 | 500字文档 | 按配置chunk_size分块 | 数量验证 |
| TC-RAG-005 | 语义检索 | 搜索"Q3目标" | 返回相关文档片段 | 召回率测试 |
| TC-RAG-006 | 向量维度 | 检索过程中 | 向量维度一致 (1536) | 日志验证 |

---

### 3.4 P2 功能详细规格

---

#### 3.4.1 Tool Calling - 即时链接阅读 (read_feishu_url)

**功能描述**  
用户发送包含飞书文档链接的消息时，AI自动调用此工具读取文档内容。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| TOOL-001 | URL识别 | 能识别消息中的飞书文档链接 |
| TOOL-002 | 文档拉取 | 调用飞书API获取文档内容 |
| TOOL-003 | Markdown转换 | 转换为LLM可读的Markdown格式 |
| TOOL-004 | 内容注入 | 将文档内容作为上下文注入对话 |
| TOOL-005 | 多类型支持 | 支持云文档、多维表格、消息卡片 |
| TOOL-006 | 超长截断 | 单文档最大10,000字符，超出截断 |

**Tool定义**

```typescript
// Vercel AI SDK Tool定义
const readFeishuUrlTool = {
  name: 'read_feishu_url',
  description: '读取用户提供的飞书文档链接内容，转换为Markdown格式。适用于需要AI阅读并总结文档的场景。',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '飞书文档或多维表格的完整URL'
      },
      purpose: {
        type: 'string',
        description: '用户要求AI对文档做什么（如"总结核心观点"、"提取关键数据"）'
      }
    },
    required: ['url']
  }
};

// 执行逻辑
async function handleReadFeishuUrl(url: string, purpose: string): Promise<string> {
  // 1. 解析URL获取文档ID和类型
  const { docId, docType } = parseFeishuUrl(url);
  
  // 2. 调用MCP工具获取文档（带降级）
  let content: string;
  try {
    content = await readDocumentWithFallback(docId, docType);
  } catch (error) {
    return `❌ 无法读取文档: ${error.message}`;
  }
  
  // 3. 转换为Markdown
  const markdown = convertToMarkdown(content, docType);
  
  // 4. 截断超长文档（保护LLM上下文）
  const maxLength = parseInt(process.env.MAX_MESSAGE_LENGTH || '10000');
  return truncateIfNeeded(markdown, maxLength);
}
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-TOOL-001 | 文档链接读取 | 发送"总结这个文档 https://..." | AI读取并总结 | 手动测试 |
| TC-TOOL-002 | 多维表格 | 发送多维表格链接 | 正确提取表格数据 | 数据验证 |
| TC-TOOL-003 | 无权限文档 | 读取无权限文档 | 返回权限不足提示 | 权限测试 |
| TC-TOOL-004 | 超长文档 | 100页文档 | 智能截断，不超上下文 | 边界测试 |

---

#### 3.4.2 Tool Calling - 历史知识检索 (search_local_kb)

**功能描述**  
AI根据对话上下文自动判断是否需要检索知识库，并执行语义检索。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| TOOL-010 | 上下文判断 | AI能判断何时需要检索知识库 |
| TOOL-011 | 语义检索 | 在LanceDB中执行语义相似度搜索 |
| TOOL-012 | Top-K召回 | 返回最相关的K个chunk（默认K=5） |
| TOOL-013 | 结果注入 | 将检索结果注入LLM上下文 |
| TOOL-014 | 混合召回 | 结合MCP搜索和本地向量检索 |

**Tool定义**

```typescript
const searchLocalKbTool = {
  name: 'search_local_kb',
  description: '在本地知识库中检索与问题相关的文档片段。适用于询问历史沉淀知识、项目背景、决策记录等场景。',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '用户的检索 query'
      },
      top_k: {
        type: 'number',
        description: '返回最相关的chunk数量',
        default: 5
      },
      filter_folder: {
        type: 'string',
        description: '可选，限定在特定文件夹中检索'
      }
    },
    required: ['query']
  }
};

// 执行逻辑
async function handleSearchLocalKb(
  query: string, 
  topK: number = 5,
  filterFolder?: string
): Promise<string> {
  // 1. 生成query向量
  const queryVector = await embeddingService.embed(query);
  
  // 2. LanceDB语义检索
  const results = await vectorStore.search({
    vector: queryVector,
    topK: Math.min(topK, parseInt(process.env.MAX_RETRIEVAL_CHUNKS || '5')),
    filter: filterFolder ? { folder_id: filterFolder } : undefined,
    includeMetadata: true
  });
  
  // 3. 格式化结果
  if (results.length === 0) {
    return '知识库中未找到相关内容。';
  }
  
  const context = results.map(r => 
    `[来源: ${r.doc_title}](${r.doc_url})\n${r.text_chunk}`
  ).join('\n\n---\n\n');
  
  return `【知识库检索结果】\n\n${context}`;
}
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-TOOL-010 | 知识检索 | "Q3目标是什么" | 返回相关文档片段 | 召回率测试 |
| TC-TOOL-011 | 无结果 | 检索不存在的内容 | 返回空或低相关度 | 边界测试 |
| TC-TOOL-012 | 混合检索 | 模糊问题 | MCP+向量双重召回 | 对比测试 |

---

#### 3.4.3 Tool Calling - 对话成果归档 (save_to_new_doc)

**功能描述**  
将对话内容整理后保存为新的飞书云文档。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| TOOL-020 | 归档触发 | 支持指令触发（"/save"或"归档"） |
| TOOL-021 | 对话提取 | 提取当前Thread完整对话记录 |
| TOOL-022 | 智能整理 | LLM将对话整理为结构化Markdown |
| TOOL-023 | 文档创建 | 在指定目录创建新的飞书云文档 |
| TOOL-024 | 权限控制 | 仅在用户明确授权目录下创建 |
| TOOL-025 | 结果反馈 | 回复新文档的卡片链接 |

**Tool定义**

```typescript
const saveToNewDocTool = {
  name: 'save_to_new_doc',
  description: '将当前对话内容整理成结构化文档并保存到飞书。仅创建新文档，绝不修改已有文档。',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: '文档标题（可选，不提供则AI自动生成）'
      },
      save_folder_url: {
        type: 'string',
        description: '保存到的飞书文件夹URL'
      },
      summary_mode: {
        type: 'string',
        enum: ['full', 'summary', 'action_items'],
        description: '保存模式：完整记录 / 摘要总结 / 行动项'
      }
    },
    required: ['save_folder_url']
  }
};

// 执行逻辑
async function handleSaveToNewDoc(
  threadId: string,
  title: string | undefined,
  saveFolderUrl: string,
  summaryMode: 'full' | 'summary' | 'action_items'
): Promise<string> {
  // 1. 提取对话记录（根据THREAD_MESSAGE_LIMIT限制）
  const messageLimit = parseInt(process.env.THREAD_MESSAGE_LIMIT || '20');
  const conversation = await sessionManager.getConversation(threadId, messageLimit);
  
  // 2. LLM整理
  const systemPrompt = getOrganizePrompt(summaryMode);
  const organized = await llmRouter.generate({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(conversation) }
    ]
  });
  
  // 3. 创建文档（带降级）
  const doc = await createDocumentWithFallback(saveFolderUrl, title, organized);
  
  // 4. 返回链接卡片
  return JSON.stringify(docLinkCard(doc.title, doc.url));
}
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-TOOL-020 | 指令归档 | 发送"/save" | 触发归档流程 | 手动测试 |
| TC-TOOL-021 | 完整记录 | 保存模式=full | 完整对话记录 | 内容验证 |
| TC-TOOL-022 | 摘要模式 | 保存模式=summary | 生成摘要 | 内容验证 |
| TC-TOOL-023 | 新建文档 | 归档完成 | 飞书目录新增文档 | 手动验证 |
| TC-TOOL-024 | 越权防护 | 用户A尝试保存到用户B的目录 | 权限不足报错 | 安全测试 |

---

### 3.5 P3 功能详细规格

---

#### 3.5.1 Thread会话管理 (Thread-based Session)

**功能描述**  
实现话题级会话隔离，每个Thread绑定特定模型，对话上下文严格隔离。

**详细需求**

| 编号 | 需求描述 | 验收标准 |
|-----|---------|---------|
| THREAD-001 | Thread绑定模型 | 新对话在Thread级别绑定选定模型（root_id） |
| THREAD-002 | 上下文隔离 | 不同Thread之间上下文完全隔离 |
| THREAD-003 | 模型锁定 | Thread一旦绑定，不可切换模型 |
| THREAD-004 | 历史上下文 | 同一Thread内Reply共享上下文 |
| THREAD-005 | Thread元数据 | 存储Thread绑定的模型、创建时间等 |
| THREAD-006 | 历史截断 | 超过THREAD_MESSAGE_LIMIT时截断旧消息 |

**技术实现**

```typescript
// ThreadContext - 注意 threadId = 飞书 root_id
interface ThreadContext {
  threadId: string;           // 飞书 root_id（消息树的根消息ID）
  p2pId: string;              // 私聊会话ID
  modelId: string;            // 绑定的模型ID
  modelName: string;          // 模型名称（展示用）
  systemPrompt: string;        // 定制系统提示词
  messages: Message[];         // 对话历史
  messageCount: number;        // 消息计数
  messageLimit: number;       // 消息上限（来自环境变量）
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;       // 最后消息时间
}

// Thread创建流程
async function createOrGetThread(
  p2pId: string,
  rootId?: string,       // 飞书消息的 root_id
  parentId?: string,      // 飞书消息的 parent_id
  modelId?: string
): Promise<ThreadContext> {
  // 情况1: parentId为空 = 这是Thread的第一条消息，需要创建新Session
  if (!parentId || parentId === rootId) {
    const newThread = {
      threadId: rootId || generateUUID(),
      p2pId,
      modelId: modelId || configStore.getDefaultModelId(),
      messages: [],
      messageCount: 0,
      messageLimit: parseInt(process.env.THREAD_MESSAGE_LIMIT || '20'),
      createdAt: new Date().toISOString(),
      // ...
    };
    
    await threadStore.save(newThread);
    return newThread;
  }
  
  // 情况2: parentId不为空 = Thread已存在，直接返回
  const existingThread = await threadStore.getByRootId(rootId);
  if (!existingThread) {
    // 异常情况：parent存在但Thread不存在，应该记录日志
    console.error(`Thread不存在但收到回复: rootId=${rootId}, parentId=${parentId}`);
    throw new Error('Thread会话不存在');
  }
  
  return existingThread;
}

// 获取对话历史（自动截断）
async function getConversation(
  threadId: string, 
  limit?: number
): Promise<Message[]> {
  const thread = await threadStore.get(threadId);
  const messageLimit = limit || thread.messageLimit;
  
  // 返回最近N条消息
  return thread.messages.slice(-messageLimit);
}
```

---

#### 3.5.2 Admin控制台 (Web Admin UI)

**功能描述**  
纯配置和监控后台，禁止包含任何聊天交互界面。

**页面划分**

| 页面 | 功能 | 优先级 |
|-----|------|-------|
| 状态监控台 | WebSocket状态、向量库统计、同步状态 | P0 |
| 环境配置 | 飞书App ID/Secret、MCP配置 | P0 |
| 模型管理 | 模型列表、API Key、默认模型 | P0 |
| 知识库绑定 | 文件夹URL配置、同步控制 | P1 |
| MCP工具授权 | 工具开关、权限矩阵 | P1 |

**组件设计规范**

```
色彩系统：
- Primary: #FE5746 (飞书红)
- Secondary: #00A9FF (飞书蓝)
- Success: #00C269
- Warning: #FFB800
- Error: #FF3B3B
- Background: #F7F8FA
- Surface: #FFFFFF
- Text Primary: #1F2329
- Text Secondary: #646A73

字体系统：
- 主字体: Inter, -apple-system, sans-serif
- 代码字体: JetBrains Mono, monospace
- 标题: 20px/600 (H1), 16px/600 (H2), 14px/500 (H3)
- 正文: 14px/400
- 辅助: 12px/400

间距系统 (4px基准):
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
```

**QA测试用例**

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-ADMIN-001 | 环境配置 | 修改飞书App Secret | 保存成功，重连生效 | 手动测试 |
| TC-ADMIN-002 | 模型管理 | 添加新模型 | 模型列表更新 | 手动测试 |
| TC-ADMIN-003 | 状态监控 | 查看监控面板 | 显示实时状态 | 手动测试 |
| TC-ADMIN-004 | 响应式 | 手机端访问 | 正常显示 | 兼容性测试 |

---

## 四、API接口规格

### 4.1 Admin REST API

**Base URL**: `http://localhost:3000/api/admin`

**认证**: Bearer Token (从环境变量 ADMIN_API_SECRET)

---

#### 4.1.1 健康检查

```
GET /health

Response 200:
{
  "status": "healthy",
  "uptime": 3600,
  "wsConnected": true,
  "mcpConnected": true,
  "mcpFallbackActive": false,
  "vectorDbStatus": "ready",
  "timestamp": "2026-04-11T12:00:00Z"
}
```

---

#### 4.1.2 获取配置

```
GET /config

Response 200:
{
  "feishu": {
    "appId": "cli_xxx",
    "botName": "AI_Feishu"
  },
  "mcp": {
    "serverUrl": "http://localhost:3001",
    "connected": true,
    "fallbackEnabled": true
  },
  "defaultModel": "gpt-4o",
  "syncInterval": 3600,
  "threadMessageLimit": 20,
  "maxRetrievalChunks": 5
}
```

---

#### 4.1.3 更新飞书配置

```
PUT /config/feishu
Body:
{
  "appId": "cli_xxx",
  "appSecret": "xxx"
}

Response 200:
{
  "success": true,
  "message": "配置已更新，服务将重连"
}
```

---

#### 4.1.4 模型管理

```
GET /models

Response 200:
{
  "models": [
    {
      "id": "uuid",
      "name": "GPT-4o",
      "provider": "openai",
      "modelId": "gpt-4o",
      "isDefault": true,
      "enabled": true
    }
  ]
}

POST /models
Body:
{
  "name": "Claude-3.5",
  "provider": "anthropic",
  "apiKey": "sk-ant-xxx",
  "baseUrl": "https://api.anthropic.com",
  "modelId": "claude-3-5-sonnet-20241022",
  "isDefault": false
}

Response 201:
{
  "id": "uuid",
  "success": true
}

DELETE /models/:id
Response 200:
{
  "success": true
}
```

---

#### 4.1.5 知识库管理

```
GET /kb/folders

Response 200:
{
  "folders": [
    {
      "id": "uuid",
      "name": "AI沉淀",
      "url": "https://xxx.feishu.cn/drive/xxx",
      "lastSyncAt": "2026-04-11T10:00:00Z",
      "lastSyncDocCount": 42,
      "syncEnabled": true,
      "docCount": 42
    }
  ]
}

POST /kb/folders
Body:
{
  "url": "https://xxx.feishu.cn/drive/xxx"
}

Response 201:
{
  "id": "uuid",
  "success": true
}

POST /kb/sync
Body (optional):
{
  "folderId": "uuid"  // 不传则全量同步
}

Response 202:
{
  "jobId": "uuid",
  "message": "同步任务已启动"
}

GET /kb/stats

Response 200:
{
  "totalChunks": 15420,
  "totalDocuments": 128,
  "lastSyncAt": "2026-04-11T10:00:00Z",
  "storageSize": "128MB"
}
```

---

#### 4.1.6 MCP工具授权

```
GET /mcp/tools

Response 200:
{
  "tools": [
    {
      "name": "read_document",
      "description": "读取飞书文档",
      "enabled": true,
      "hasFallback": true,
      "fallbackMethod": "feishu.docx.document.get"
    },
    {
      "name": "create_document",
      "description": "创建飞书文档",
      "enabled": true,
      "hasFallback": true,
      "fallbackMethod": "feishu.docx.document.create"
    }
  ]
}

PUT /mcp/tools/:name
Body:
{
  "enabled": false
}

Response 200:
{
  "success": true
}
```

---

### 4.2 飞书回调接口

**URL**: `http://localhost:3000/api/callback/feishu`  
**Method**: POST  
**认证**: 飞书签名校验

---

#### 4.2.1 消息回调

```typescript
// 飞书POST过来的消息体
interface FeishuCallback {
  schema: '2.0';
  header: {
    event_id: string;
    event_type: 'im.message.receive_v1';
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: {
    sender: {
      sender_id: { open_id: string };
      sender_type: 'user' | 'bot';
    };
    receiver: {
      receiver_id: { open_id: string };
      receiver_type: 'user' | 'bot';
    };
    message: {
      message_id: string;
      root_id: string;      // Thread根消息ID
      parent_id: string;    // 父消息ID（空=新Thread）
      create_time: string;
      chat_id: string;
      chat_type: 'p2p' | 'group';
      message_type: 'text' | 'interactive';
      content: string;  // JSON: {"text":"xxx"} 或 {"card":{...}}
    };
  };
}
```

---

#### 4.2.2 回调响应

```typescript
// 成功处理
Response 200:
{
  "code": 0,
  "msg": "success"
}

// 需要更新卡片（流式场景）
Response 200:
{
  "code": 0,
  "msg": "success",
  "data": {
    "message_id": "om_xxx",
    "updateCard": true
  }
}
```

---

## 五、数据模型

### 5.1 SQLite数据库模型

```sql
-- 配置数据库版本
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- 模型配置表
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'gemini', 'ollama')),
  api_key_encrypted TEXT NOT NULL,  -- AES-256-GCM加密
  base_url TEXT NOT NULL,
  model_id TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 4096,
  temperature REAL DEFAULT 0.7,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 会话表 (Thread绑定模型)
-- 注意: thread_id = 飞书消息的 root_id
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL UNIQUE,  -- 飞书root_id
  p2p_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  system_prompt TEXT,
  message_count INTEGER DEFAULT 0,
  message_limit INTEGER DEFAULT 20,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- 知识库文件夹表
CREATE TABLE IF NOT EXISTS kb_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  folder_token TEXT NOT NULL,
  last_sync_at TEXT,
  last_sync_doc_count INTEGER DEFAULT 0,
  sync_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

-- MCP工具授权表
CREATE TABLE IF NOT EXISTS mcp_tool_auth (
  tool_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  fallback_enabled INTEGER DEFAULT 1,
  fallback_method TEXT,
  updated_at TEXT NOT NULL
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sessions_thread ON sessions(thread_id);
CREATE INDEX IF NOT EXISTS idx_sessions_p2p ON sessions(p2p_id);
CREATE INDEX IF NOT EXISTS idx_kb_folders_token ON kb_folders(folder_token);
```

### 5.2 LanceDB向量数据库Schema

```typescript
// 向量表定义 - LanceDB兼容格式
import { 
  Table, 
  lanceSchema, 
  Int32, 
  Float32,
  Utf8,
  Int64 
} from 'vectordb';

const chunkSchema = lanceSchema({
  id: Int32,
  doc_id: Utf8,           // 源文档ID
  doc_title: Utf8,        // 源文档标题
  doc_url: Utf8,          // 飞书文档URL
  folder_id: Utf8,        // 所属文件夹ID
  text_chunk: Utf8,       // 分块文本内容
  token_count: Int32,     // token数量
  vector: Float32,         // 向量数组 (需指定dimension=1536)
  doc_updated_at: Int64,   // 文档更新时间戳（毫秒）
  chunk_index: Int32,      // 块在文档中的索引
  created_at: Int64,      // 创建时间戳（毫秒）
  sync_status: Utf8,      // 'pending' | 'synced' | 'failed'
});

// 表配置
const tableConfig = {
  name: 'document_chunks',
  schema: chunkSchema,
  embeddingDim: 1536,  // text-embedding-3-small
  index: {
    type: 'IVF_PQ',
    metric: 'L2',
    numSubvectors: 96
  }
};
```

---

## 六、安全与可观测性

### 6.1 安全加固

#### 6.1.1 API Key加密

```typescript
// 加密算法：AES-256-GCM
// 密钥来源：环境变量 ENCRYPTION_KEY（32字节hex）

interface EncryptedData {
  ciphertext: string;    // Base64编码密文
  iv: string;           // 初始化向量（12字节）
  tag: string;          // 认证标签（16字节）
}

// 加密流程
function encryptApiKey(plainText: string, key: string): EncryptedData {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64')
  };
}

// 解密流程
function decryptApiKey(data: EncryptedData, key: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm', 
    Buffer.from(key, 'hex'), 
    Buffer.from(data.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  
  let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

#### 6.1.2 Admin API认证

```typescript
// Bearer Token认证
// Header: Authorization: Bearer <ADMIN_API_SECRET>

async function verifyAdminToken(token: string): Promise<boolean> {
  const expectedToken = process.env.ADMIN_API_SECRET;
  if (!expectedToken) {
    console.error('ADMIN_API_SECRET 未配置');
    return false;
  }
  
  // 使用timingSafeEqual防止时序攻击
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
}
```

#### 6.1.3 飞书回调签名校验

```typescript
// 回调签名校验（可选，FEISHU_VERIFICATION_TOKEN配置后启用）
function verifyFeishuSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const token = process.env.FEISHU_VERIFICATION_TOKEN;
  if (!token) return true;  // 未配置则跳过校验
  
  const str = timestamp + body;
  const expectedSig = crypto
    .createHmac('sha256', token)
    .update(str)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}
```

### 6.2 日志与可观测性

#### 6.2.1 日志格式规范

```typescript
// JSON格式日志
interface LogEntry {
  timestamp: string;      // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;        // 'ws-manager' | 'mcp-client' | 'llm-router' etc.
  message: string;
  traceId?: string;       // 请求追踪ID
  data?: Record<string, unknown>;  // 附加数据
}

// 示例
{
  "timestamp": "2026-04-11T12:00:00.000Z",
  "level": "info",
  "service": "message-handler",
  "message": "消息处理完成",
  "traceId": "abc123",
  "data": {
    "messageId": "om_xxx",
    "threadId": "root_xxx",
    "modelId": "gpt-4o",
    "durationMs": 1234
  }
}
```

#### 6.2.2 关键事件打点

| 事件名称 | 触发条件 | 记录数据 |
|---------|---------|---------|
| `message.received` | 收到飞书消息 | messageId, threadId, chatType |
| `message.sent` | 发送消息完成 | messageId, threadId, duration |
| `tool.called` | Tool被调用 | toolName, success, duration |
| `tool.failed` | Tool调用失败 | toolName, error, fallbackUsed |
| `rag.retrieved` | RAG检索执行 | query, resultsCount, duration |
| `mcp.connected` | MCP连接成功 | serverUrl |
| `mcp.fallback` | 触发MCP降级 | toolName, fallbackMethod |
| `ws.reconnected` | WebSocket重连 | attemptCount, duration |
| `error.*` | 任何错误 | errorType, message, stack |

#### 6.2.3 日志级别配置

```typescript
// 环境变量: LOG_LEVEL
// 支持: debug | info | warn | error

const logLevels = {
  development: 'debug',
  production: 'info',
  test: 'error'
};
```

---

## 七、部署与运维

### 7.1 进程管理配置

```ini
# ecosystem.config.js (PM2)
module.exports = {
  apps: [{
    name: 'ai-feishu',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
```

### 7.2 数据备份策略

| 数据类型 | 备份频率 | 保留周期 | 存储位置 |
|---------|---------|---------|---------|
| SQLite (config.db) | 每日增量 + 每周全量 | 30天 | 本地 `./data/backups/` |
| LanceDB (vectors/) | 每日增量 + 每周全量 | 30天 | 本地 `./data/backups/` |
| 日志文件 | 实时同步 | 7天 | `./logs/` |

### 7.3 升级迁移流程

```bash
# 1. 停止服务
pm2 stop ai-feishu

# 2. 备份数据
cp -r data data.backup.$(date +%Y%m%d)

# 3. 安装新版本
npm install
npm run build

# 4. 运行数据库迁移（如有）
npm run migrate

# 5. 重启服务
pm2 start ai-feishu
pm2 logs --nostream  # 验证启动正常

# 6. 健康检查
curl http://localhost:3000/api/admin/health
```

---

## 八、API接口规格

### 8.1 Admin REST API

**Base URL**: `http://localhost:3000/api/admin`

**认证**: Bearer Token (从环境变量 ADMIN_API_SECRET)

---

#### 8.1.1 健康检查

```
GET /health

Response 200:
{
  "status": "healthy",
  "uptime": 3600,
  "wsConnected": true,
  "mcpConnected": true,
  "vectorDbStatus": "ready",
  "timestamp": "2026-04-11T12:00:00Z"
}
```

---

#### 8.1.2 获取配置

```
GET /config

Response 200:
{
  "feishu": {
    "appId": "cli_xxx",
    "botName": "AI_Feishu"
  },
  "mcp": {
    "serverUrl": "http://localhost:3001",
    "connected": true
  },
  "defaultModel": "gpt-4o",
  "syncInterval": 3600
}
```

---

#### 8.1.3 更新飞书配置

```
PUT /config/feishu
Body:
{
  "appId": "cli_xxx",
  "appSecret": "xxx"
}

Response 200:
{
  "success": true,
  "message": "配置已更新，服务将重连"
}
```

---

#### 8.1.4 模型管理

```
GET /models

Response 200:
{
  "models": [
    {
      "id": "uuid",
      "name": "GPT-4o",
      "provider": "openai",
      "modelId": "gpt-4o",
      "isDefault": true,
      "enabled": true
    }
  ]
}

POST /models
Body:
{
  "name": "Claude-3.5",
  "provider": "anthropic",
  "apiKey": "sk-ant-xxx",
  "baseUrl": "https://api.anthropic.com",
  "modelId": "claude-3-5-sonnet-20241022",
  "isDefault": false
}

Response 201:
{
  "id": "uuid",
  "success": true
}

DELETE /models/:id
Response 200:
{
  "success": true
}
```

---

#### 8.1.5 知识库管理

```
GET /kb/folders

Response 200:
{
  "folders": [
    {
      "id": "uuid",
      "name": "AI沉淀",
      "url": "https://xxx.feishu.cn/drive/xxx",
      "lastSyncAt": "2026-04-11T10:00:00Z",
      "syncEnabled": true,
      "docCount": 42
    }
  ]
}

POST /kb/folders
Body:
{
  "url": "https://xxx.feishu.cn/drive/xxx"
}

Response 201:
{
  "id": "uuid",
  "success": true
}

POST /kb/sync
Body (optional):
{
  "folderId": "uuid"  // 不传则全量同步
}

Response 202:
{
  "jobId": "uuid",
  "message": "同步任务已启动"
}

GET /kb/stats

Response 200:
{
  "totalChunks": 15420,
  "totalDocuments": 128,
  "lastSyncAt": "2026-04-11T10:00:00Z",
  "storageSize": "128MB"
}
```

---

#### 8.1.6 MCP工具授权

```
GET /mcp/tools

Response 200:
{
  "tools": [
    {
      "name": "read_document",
      "description": "读取飞书文档",
      "enabled": true,
      "defaultEnabled": true
    },
    {
      "name": "create_document",
      "description": "创建飞书文档",
      "enabled": true,
      "defaultEnabled": true
    }
  ]
}

PUT /mcp/tools/:name
Body:
{
  "enabled": false
}

Response 200:
{
  "success": true
}
```

---

### 8.2 飞书回调接口

**URL**: `http://localhost:3000/api/callback/feishu`  
**Method**: POST  
**认证**: 飞书签名校验

---

#### 8.2.1 消息回调

```typescript
// 飞书POST过来的消息体
interface FeishuCallback {
  schema: '2.0';
  header: {
    event_id: string;
    event_type: 'im.message.receive_v1';
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: {
    sender: {
      sender_id: { open_id: string };
      sender_type: 'user' | 'bot';
    };
    message: {
      message_id: string;
      chat_id: string;
      chat_type: 'p2p' | 'group';
      message_type: 'text' | 'interactive';
      content: string;  // JSON: {"text":"xxx"} 或 {"card":{...}}
    };
  };
}
```

---

#### 8.2.2 回调响应

```typescript
// 成功处理
Response 200:
{
  "code": 0,
  "msg": "success"
}

// 需要更新卡片
Response 200:
{
  "code": 0,
  "msg": "success",
  "data": {
    "message_id": "om_xxx",
    "update卡片": true
  }
}
```

---

## 九、数据模型

### 9.1 SQLite数据库模型

```sql
-- 配置数据库版本
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- 模型配置表
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'gemini', 'ollama')),
  api_key_encrypted TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model_id TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 4096,
  temperature REAL DEFAULT 0.7,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL UNIQUE,
  p2p_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  system_prompt TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- 知识库文件夹表
CREATE TABLE IF NOT EXISTS kb_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  folder_token TEXT NOT NULL,
  last_sync_at TEXT,
  sync_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

-- MCP工具授权表
CREATE TABLE IF NOT EXISTS mcp_tool_auth (
  tool_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sessions_thread ON sessions(thread_id);
CREATE INDEX IF NOT EXISTS idx_sessions_p2p ON sessions(p2p_id);
CREATE INDEX IF NOT EXISTS idx_kb_folders_token ON kb_folders(folder_token);
```

### 9.2 LanceDB向量数据库Schema

```typescript
// 向量表定义
const chunkSchema = new lanceSchema({
  id: new Int32(),
  doc_id: new Utf8(),
  doc_title: new Utf8(),
  doc_url: new Utf8(),
  folder_id: new Utf8(),
  text_chunk: new Utf8(),
  token_count: new Int32(),
  vector: new Float32Vector(lanceDbDimension),  // 1536维
  created_at: new Timestamp(),
  updated_at: new Timestamp(),
  sync_status: new Utf8(),  // 'pending' | 'synced' | 'failed'
});

// 表名: document_chunks
// 索引: vector (L2距离, IVF_PQ索引)
```

---

## 十、UI/UX规格

### 10.1 设计规范

**设计系统**  
采用 shadcn/ui 组件库，定制飞书品牌色彩主题。

**色彩系统**

```css
:root {
  /* 飞书品牌色 */
  --feishu-primary: #FE5746;
  --feishu-secondary: #00A9FF;
  --feishu-background: #F7F8FA;
  
  /* 语义色 */
  --color-success: #00C269;
  --color-warning: #FFB800;
  --color-error: #FF3B3B;
  --color-info: #00A9FF;
  
  /* 中性色 */
  --color-gray-50: #F7F8FA;
  --color-gray-100: #F2F3F5;
  --color-gray-200: #E5E6EB;
  --color-gray-300: #C9CDD4;
  --color-gray-500: #646A73;
  --color-gray-800: #1F2329;
  --color-gray-900: #0F1111;
}
```

**字体系统**

```css
--font-sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
```

**间距系统**

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-12: 3rem;      /* 48px */
```

**圆角系统**

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
```

**阴影系统**

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
```

### 10.2 页面原型描述 (Admin控制台)

#### 10.2.1 状态监控台 (Dashboard)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI_Feishu 管理控制台                                           [用户菜单 ▼] │
├──────────┬──────────────────────────────────────────────────────────────────┤
│          │ ┌─────────────────────────────────────────────────────────────┐  │
│ Dashboard│ │  系统状态                                         12:00:00   │  │
│ Settings │ │  ─────────────────────────────────────────────────────────  │  │
│ Models   │ │                                                             │  │
│ KB       │ │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐│  │
│ MCP Auth │ │  │ ● WebSocket│  │ ● MCP      │  │ ● VectorDB │  │● LLM   ││  │
│          │ │  │   已连接    │  │   已连接    │  │   就绪     │  │GPT-4o  ││  │
│          │ │  └────────────┘  └────────────┘  └────────────┘  └────────┘│  │
│          │ │                                                             │  │
│          │ │  ┌─────────────────────────────────────────────────────┐   │  │
│          │ │  │ 知识库统计                              [全量同步 ▼]  │   │  │
│          │ │  │ ─────────────────────────────────────────────────  │   │  │
│          │ │  │ 文档总数: 128      Chunk数量: 15,420    存储: 128MB  │   │  │
│          │ │  │ 最后同步: 2026-04-11 10:00                      │   │  │
│          │ │  └─────────────────────────────────────────────────────┘   │  │
│          │ │                                                             │  │
│          │ │  ┌─────────────────────────────────────────────────────┐   │  │
│          │ │  │ 最近同步记录                                        │   │  │
│          │ │  │ ─────────────────────────────────────────────────  │   │  │
│          │ │  │ 10:00  AI沉淀   ✓ 42文档已同步                      │   │  │
│          │ │  │ 09:00  产品文档  ✓ 86文档已同步                      │   │  │
│          │ │  └─────────────────────────────────────────────────────┘   │  │
│          │ └─────────────────────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

#### 10.2.2 模型管理页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI_Feishu 管理控制台                                           [用户菜单 ▼] │
├──────────┬──────────────────────────────────────────────────────────────────┤
│          │ ┌─────────────────────────────────────────────────────────────┐  │
│ Dashboard│ │  模型管理                                        [+ 添加模型] │  │
│ Settings │ │  ─────────────────────────────────────────────────────────  │  │
│ Models ● │ │                                                             │  │
│ KB       │ │  ┌─────────────────────────────────────────────────────┐   │  │
│ MCP Auth │ │  │ 默认 模型                                            │   │  │
│          │ │  │ ─────────────────────────────────────────────────── │   │  │
│          │ │  │  🤖 GPT-4o                      OpenAI     [编辑] [删除]│   │  │
│          │ │  │     gpt-4o • 4096 tokens • temperature: 0.7         │   │  │
│          │ │  │     API: https://api.openai.com/v1                  │   │  │
│          │ │  └─────────────────────────────────────────────────────┘   │  │
│          │ │                                                             │  │
│          │ │  ┌─────────────────────────────────────────────────────┐   │  │
│          │ │  │ 其他模型                                             │   │  │
│          │ │  │ ─────────────────────────────────────────────────── │   │  │
│          │ │  │  🤖 Claude-3.5 Sonnet           Anthropic  [编辑] [删除]│  │
│          │ │  │     claude-3-5-sonnet-20241022 • 4096 tokens        │   │  │
│          │ │  │                                                        │   │  │
│          │ │  │  🤖 Gemini-1.5-Pro              Google     [编辑] [删除]│ │
│          │ │  │     gemini-1.5-pro • 8192 tokens                     │   │  │
│          │ │  │                                                        │   │  │
│          │ │  │  🤖 Llama-3 (本地)                   Ollama   [编辑] [删除]│ │
│          │ │  │     llama3 • 8192 tokens • http://localhost:11434     │   │  │
│          │ │  └─────────────────────────────────────────────────────┘   │  │
│          │ └─────────────────────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

### 10.3 飞书端交互原型

#### 10.3.1 私聊模式 - 会话启动

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI_Feishu 机器人                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │  🆕 新建 AI 对话                                                  │      │
│    │  ────────────────────────────────────────────────────────────  │      │
│    │                                                                   │      │
│    │  选择一个AI引擎开始对话                                            │      │
│    │                                                                   │      │
│    │  ┌───────────────────────────────────────────────────────────┐  │      │
│    │  │ 选择 AI 引擎...                                      ▼    │  │      │
│    │  └───────────────────────────────────────────────────────────┘  │      │
│    │                                                                   │      │
│    │  对话主题（可选）                                                   │      │
│    │  ┌───────────────────────────────────────────────────────────┐  │      │
│    │  │                                                           │  │      │
│    │  └───────────────────────────────────────────────────────────┘  │      │
│    │                                                                   │      │
│    │                      [ 🚀 开始对话 ]                             │      │
│    │                                                                   │      │
│    └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 10.3.2 流式响应

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI_Feishu 机器人                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │  🤖 Claude-3.5 Sonnet                                           │      │
│    │  ────────────────────────────────────────────────────────────  │      │
│    │                                                                   │      │
│    │  根据文档内容，我总结了以下核心观点：                                │      │
│    │                                                                   │      │
│    │  1. **产品定位**                                                  │      │
│    │     AI_Feishu 是一个基于飞书生态的本地化 AI 知识库系统              │      │
│    │                                                                   │      │
│    │  2. **核心价值**                                                  │      │
│    │     • 消除多工具切换的摩擦力                                       │      │
│    │     • 数据 100% 本地化，保障隐私                                   │      │
│    │     • 飞书原生交互体验                                             │      │
│    │                                                                   │      │
│    │  3. **技术架构**                                                  │      │
│    │     采用 B/S 架构，Node.js + Hono.js 后端，React + Vite 前端       │      │
│    │     向量库使用 LanceDB，配置库使用 SQLite                          │      │
│    │                                                                   │      │
│    │                                              [文档链接] [ 💾 归档 ]│      │
│    └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 十一、迭代计划与验收标准

### 11.1 Sprint 1: 基础设施建设 (1周)

**目标**: 完成项目骨架搭建、数据库初始化、飞书机器人创建

| 任务 | 验收标准 | 依赖 | 优先级 |
|-----|---------|-----|-------|
| 项目结构搭建 | 目录结构符合设计，package.json完整 | 无 | P0 |
| TypeScript配置 | tsconfig合理，类型检查通过 | 无 | P0 |
| SQLite初始化 | 数据库创建成功，schema正确 | 无 | P0 |
| LanceDB初始化 | 向量库目录创建，连接正常 | 无 | P0 |
| 飞书应用创建 | 获得App ID/Secret，能创建机器人 | 无 | P0 |
| 环境变量模板 | .env.example完整，所有配置项有注释 | 无 | P0 |
| 安全加固 | AES-256-GCM加密实现 | 无 | P0 |
| Docker配置（可选） | docker-compose up能启动基础服务 | 无 | P1 |
| Git仓库初始化 | 提交规范，.gitignore完善 | 无 | P1 |

**交付物**: 可运行的空壳服务 + 飞书机器人可添加

**QA验证**:
```bash
# 启动服务
npm run dev

# 验证API可用
curl http://localhost:3000/api/admin/health

# 验证飞书连接
# 在飞书App中搜索机器人名称，能找到并添加
```

---

### 11.2 Sprint 2: 飞书消息通道 (1周)

**目标**: 完成飞书WebSocket长连接、消息接收与发送

| 任务 | 验收标准 | 依赖 | 优先级 |
|-----|---------|-----|-------|
| WebSocket连接 | 与飞书服务器建立长连接，日志正常 | Sprint 1 | P0 |
| 消息接收 | 私聊消息能被正确解析 | Sprint 1 | P0 |
| 消息去重 | 同一message_id不重复处理 | 消息接收 | P0 |
| 签名校验 | 开启后能正确验证消息合法性 | 消息接收 | P1 |
| 消息发送 | 能回复文本消息 | 消息接收 | P0 |
| 卡片发送 | 能下发交互卡片（官方格式） | 消息发送 | P0 |
| 断线重连 | 网络波动后自动重连 | WebSocket | P0 |
| Admin日志面板 | 能看到连接状态日志 | WebSocket | P1 |

**交付物**: 飞书私聊机器人能响应消息

**QA验证**:
```
1. 在飞书中添加机器人
2. 发送"你好"给机器人
3. 机器人回复"你好！我是AI_Feishu..."
4. 断开网络30秒后恢复
5. 发送消息，机器人继续正常响应
```

---

### 11.3 Sprint 3: 模型路由与对话 (1.5周)

**目标**: 完成多模型配置、流式输出、会话管理

| 任务 | 验收标准 | 依赖 | 优先级 |
|-----|---------|-----|-------|
| Admin模型管理页面 | 增删改查模型配置 | Sprint 1 | P0 |
| 模型配置加密 | API Key加密存储（AES-256-GCM） | Admin页面 | P0 |
| Vercel AI SDK集成 | 多模型调用正常 | Sprint 1 | P0 |
| 流式响应 | SSE格式正确，飞书卡片逐步更新 | 模型集成 | P0 |
| Thread会话隔离 | 不同Thread（root_id）上下文隔离 | Sprint 2 | P0 |
| 模型绑定 | Thread创建时绑定模型，不可切换 | Thread管理 | P0 |
| 会话启动卡片 | 下发正确格式的卡片 | Sprint 2 | P0 |
| 模型切换下拉 | 动态加载已配置模型列表 | 会话卡片 | P0 |
| 上下文管理 | 消息截断、Token预算控制 | 模型集成 | P0 |

**交付物**: 能选择不同模型进行对话，流式输出

**QA验证**:
```
1. 在Admin中配置OpenAI和Anthropic两个模型
2. 在飞书创建对话，选择Claude
3. 发送长问题，验证流式输出
4. 新建另一个对话，选择GPT-4o
5. 验证两个对话模型独立
```

---

### 11.4 Sprint 4: MCP集成 (1周)

**目标**: 对接飞书官方MCP Server，实现工具透传

| 任务 | 验收标准 | 依赖 | 优先级 |
|-----|---------|-----|-------|
| MCP Client模块 | 能连接官方MCP Server | Sprint 1 | P0 |
| MCP工具列表 | 能列出可用工具 | MCP Client | P0 |
| Admin MCP配置 | 能配置MCP Server地址和Token | Sprint 1 | P0 |
| 工具授权开关 | 可视化开关控制工具权限 | MCP工具列表 | P0 |
| MCP降级策略 | MCP不可用时自动切换原生API | MCP Client | P0 |
| read_document | 能读取飞书文档 | MCP工具 | P0 |
| create_document | 能创建新文档 | MCP工具 | P0 |
| search_wiki | 能进行飞书全局搜索 | MCP工具 | P1 |
| MCP健康检测 | Admin显示连接状态和降级状态 | MCP Client | P1 |

**交付物**: MCP工具能正常调用

**QA验证**:
```
1. 配置MCP Server地址
2. Admin中查看MCP工具列表
3. 确认read_document等工具可用
4. 测试调用read_document读取文档
5. 停止MCP Server，验证降级到原生API
```

---

### 11.5 Sprint 5: RAG Pipeline (1.5周)

**目标**: 完成文档同步、分块、向量化、检索

| 任务 | 验收标准 | 依赖 | 优先级 |
|-----|---------|-----|-------|
| 文件夹配置 | Admin配置文件夹URL | Sprint 1 | P0 |
| 飞书目录API | 能获取文件夹下文档列表 | Sprint 1 | P0 |
| 文档拉取 | 能拉取文档纯文本内容 | MCP集成 | P0 |
| 文档分块 | LangChain TextSplitter分块 | 文档拉取 | P0 |
| Embedding服务 | 调用Embedding模型向量化 | Sprint 3 | P0 |
| LanceDB写入 | 向量数据写入并建立索引 | Embedding | P0 |
| 语义检索 | Top-K召回正确 | LanceDB写入 | P0 |
| Admin知识库面板 | 显示同步状态、文档数量 | 文件夹配置 | P0 |
| 增量同步 | 仅同步新增/修改文档 | 全量同步 | P1 |
| 定时同步 | 可配置间隔自动同步 | Admin面板 | P1 |

**交付物**: 文档同步功能完整，知识库可检索

**QA验证**:
```
1. 配置一个飞书文件夹URL
2. 点击同步，等待完成
3. 查看向量库统计，确认文档数量
4. 在飞书发送"检索:Q3目标"
5. 验证返回相关文档片段
```

---

### 11.6 Sprint 6: Tool Calling集成 (1周)

**目标**: 实现三大核心Tool与飞书联动

| 任务 | 验收标准 | 依赖 | 优先级 |
|-----|---------|-----|-------|
| read_feishu_url Tool | 发送文档链接能自动读取 | Sprint 4+5 | P0 |
| search_local_kb Tool | 能触发知识库检索 | Sprint 5 | P0 |
| save_to_new_doc Tool | 能创建新文档 | Sprint 4 | P0 |
| 归档确认卡片 | 对话结束询问归档 | Tool集成 | P1 |
| 混合检索 | MCP搜索+向量检索融合 | Tool集成 | P1 |
| 超长文档截断 | 保护LLM上下文 | read工具 | P0 |
| MCP降级Tool | Tool调用失败时自动降级 | Tool集成 | P0 |

**交付物**: 三大Tool完整可用

**QA验证**:
```
1. 发送"总结这个文档 https://..."
2. AI自动读取并总结
3. 发送"我们上个月的目标是什么"
4. AI触发知识库检索并回答
5. 发送"/save"
6. AI整理对话并创建新文档
```

---

### 11.7 Sprint 7: Admin控制台完善 (0.5周)

**目标**: 完成所有Admin页面和状态监控

| 任务 | 验收标准 | 依赖 | 优先级 |
|-----|---------|-----|-------|
| Dashboard完善 | 显示所有关键指标 | Sprint 2+4+5 | P0 |
| 设置页面 | 飞书配置、MCP配置 | Sprint 1 | P0 |
| 安全日志查看 | 错误日志和操作日志 | Sprint 1 | P0 |
| 响应式适配 | 手机端正常访问 | 全页面 | P1 |
| 国际化（中/英） | 语言切换 | 全页面 | P2 |

**交付物**: 完整Admin控制台

---

### 11.8 Sprint 8: 集成测试与优化 (1周)

**目标**: 全流程测试，修复问题，优化性能

| 任务 | 验收标准 | 依赖 | 优先级 |
|-----|---------|-----|-------|
| 全流程测试 | 4大模块串联测试 | Sprint 6 | P0 |
| 性能测试 | 并发10用户无异常 | Sprint 2 | P0 |
| 安全测试 | API Key加密、权限校验 | Sprint 3+4 | P0 |
| 异常处理 | 断网、MCP宕机等场景 | Sprint 4 | P0 |
| 文档完善 | README、部署文档 | Sprint 1 | P1 |
| Bug修复 | 测试发现的所有问题 | 测试 | P0 |

**交付物**: 可发布版本

---

### 11.9 团队配置建议

| 角色 | 人数 | 职责 | 备选技术 |
|-----|-----|------|---------|
| 前端开发 | 1 | React Admin UI、Tailwind、飞书卡片 | React 18, Zustand |
| 后端开发 | 1 | Node.js/Hono, Vercel AI SDK, MCP | Hono.js, TypeScript |
| AI/数据工程师 | 0.5 | RAG Pipeline, Embedding调优 | LangChain.js, LanceDB |
| 测试工程师 | 0.5 | 全流程测试、集成测试 | Playwright |
| 产品/项目经理 | 0.5 | 需求把控、进度管理 | - |

**总工期**: 约 8 周 (40 人天 + 0.5 * 8周)

---

## 十二、模块验收清单

### 12.1 P0模块验收清单

#### [P0] 飞书消息通道

| 验收项 | 验收条件 | 验证方法 | 完成标准 |
|-------|---------|---------|---------|
| 消息接收 | 用户发送消息，服务器能收到 | 手动测试 | [ ] |
| 消息发送 | 能回复用户消息 | 手动测试 | [ ] |
| WebSocket稳定 | 运行24小时无断连 | 长时间运行测试 | [ ] |
| 断线重连 | 断网后自动重连 | 网络模拟测试 | [ ] |
| 消息去重 | 重复message_id仅处理1次 | 自动化测试 | [ ] |
| 卡片格式正确 | 卡片符合飞书官方格式 | 手动测试 | [ ] |

#### [P0] 模型路由

| 验收项 | 验收条件 | 验证方法 | 完成标准 |
|-------|---------|---------|---------|
| 模型配置 | 能增删改查模型 | Admin页面测试 | [ ] |
| 默认模型 | 能设置默认模型 | 创建新对话 | [ ] |
| 多模型调用 | 各模型均能正常响应 | 手动测试 | [ ] |
| API Key安全 | 数据库中Key为密文（AES-256-GCM） | 数据库查看 | [ ] |
| 流式输出 | SSE格式正确，逐步显示 | 手动测试 | [ ] |

#### [P0] MCP集成

| 验收项 | 验收条件 | 验证方法 | 完成标准 |
|-------|---------|---------|---------|
| MCP连接 | 能连接MCP Server | 日志验证 | [ ] |
| 工具透传 | MCP工具能传给AI SDK | 集成测试 | [ ] |
| 工具授权 | 开关能控制工具权限 | 边界测试 | [ ] |
| read_document | 能读取文档 | 手动测试 | [ ] |
| create_document | 能创建文档 | 手动验证 | [ ] |
| MCP降级 | MCP不可用时自动降级 | 故障测试 | [ ] |

#### [P0] RAG Pipeline

| 验收项 | 验收条件 | 验证方法 | 完成标准 |
|-------|---------|---------|---------|
| 文件夹配置 | Admin能配置文件夹 | Admin测试 | [ ] |
| 文档同步 | 能同步文件夹下文档 | 手动测试 | [ ] |
| 向量检索 | 语义检索返回相关结果 | 召回率测试 | [ ] |
| Admin统计 | 显示文档数量、Chunk数量 | Admin查看 | [ ] |
| 增量同步 | 仅同步变更文档 | 版本对比 | [ ] |

### 12.2 P1模块验收清单

#### [P1] Tool Calling

| 验收项 | 验收条件 | 验证方法 | 完成标准 |
|-------|---------|---------|---------|
| read_feishu_url | 发送链接能读取 | 手动测试 | [ ] |
| search_local_kb | 能触发知识库检索 | 手动测试 | [ ] |
| save_to_new_doc | 能创建新文档 | 手动验证 | [ ] |
| 归档卡片 | 对话结束询问归档 | 手动测试 | [ ] |
| 混合检索 | MCP+向量双重召回 | 对比测试 | [ ] |

#### [P1] 卡片交互

| 验收项 | 验收条件 | 验证方法 | 完成标准 |
|-------|---------|---------|---------|
| 启动卡片 | 下发正确格式卡片 | 手动测试 | [ ] |
| 模型下拉 | 动态加载模型列表 | 手动测试 | [ ] |
| Markdown渲染 | 代码块等格式正确 | 手动测试 | [ ] |
| 流式更新 | 卡片内容逐步更新 | 手动测试 | [ ] |

### 12.3 P2模块验收清单

#### [P2] Admin控制台

| 验收项 | 验收条件 | 验证方法 | 完成标准 |
|-------|---------|---------|---------|
| 环境配置面板 | 飞书/MCP配置 | 手动测试 | [ ] |
| 模型管理面板 | 模型CRUD | 手动测试 | [ ] |
| 知识库面板 | 文件夹管理、同步 | 手动测试 | [ ] |
| 状态监控台 | 显示实时状态 | 手动测试 | [ ] |

---

## 十三、系统异常处理

### 13.1 异常场景与处理策略

| 异常场景 | 严重级别 | 处理策略 | 用户感知 |
|---------|---------|---------|---------|
| WebSocket断开 | P0 | 指数退避重连，最多重试10次 | 消息延迟，最终恢复 |
| MCP Server不可用 | P1 | 自动降级到原生API | 部分功能受限 |
| LLM API超时 | P1 | 重试3次，超时返回友好提示 | "AI响应超时，请重试" |
| 飞书文档无权限 | P2 | 返回权限不足提示 | "无法读取该文档" |
| 向量库查询失败 | P1 | 降级到关键词搜索 | 召回结果可能不准 |
| API Key无效 | P0 | 记录日志，通知用户配置 | Admin告警 |
| 同步超时 | P2 | 跳过超时的文档，继续同步 | 部分文档未同步 |
| 存储空间不足 | P0 | 停止同步，告警通知 | Admin告警 |
| Thread不存在 | P2 | 记录错误，返回"会话不存在" | 错误提示 |

### 13.2 告警机制

```typescript
interface AlertConfig {
  // 告警渠道
  channels: ('log' | 'email' | 'webhook')[];
  
  // 告警阈值
  thresholds: {
    wsDisconnectMinutes: 5;      // WebSocket断连超过5分钟
    apiErrorRate: 0.05;         // API错误率超过5%
    diskUsagePercent: 90;       // 磁盘使用超过90%
    syncFailureCount: 10;       // 同步失败超过10次
  };
  
  // 告警静默时段
  silencePeriods: {
    start: '22:00';
    end: '09:00';
    timezone: 'Asia/Shanghai';
  };
}
```

---

## 十四、附录

### 14.1 参考资料

| 资料 | 链接 | 用途 |
|-----|------|-----|
| 飞书开放平台文档 | https://open.feishu.cn/ | API参考 |
| Vercel AI SDK文档 | https://sdk.vercel.ai/ | AI路由 |
| LanceDB文档 | https://lancedb.github.io/lancedb/ | 向量库 |
| Hono.js文档 | https://hono.dev/ | 后端框架 |
| MCP协议规范 | https://modelcontextprotocol.io/ | MCP集成 |
| shadcn/ui文档 | https://ui.shadcn.com/ | UI组件 |
| 飞书卡片编辑器 | https://open.feishu.cn/document/card-editor | 卡片设计 |

### 14.2 术语表

| 术语 | 英文全称 | 解释 |
|-----|---------|-----|
| RAG | Retrieval-Augmented Generation | 检索增强生成，结合检索和生成的AI范式 |
| MCP | Model Context Protocol | 模型上下文协议，AI工具标准化方案 |
| SSE | Server-Sent Events | 服务器推送事件，用于流式响应 |
| LanceDB | - | 本地嵌入式向量数据库 |
| Tool Calling | - | AI模型调用外部工具的能力 |
| Chunk | - | 文档分块后的文本片段 |
| Embedding | - | 将文本转为向量的过程/结果 |
| Thread | - | 飞书消息话题/线程（以root_id标识） |
| root_id | - | 飞书消息的根消息ID，Thread的唯一标识 |
| P2P | Peer-to-Peer | 飞书私聊会话 |
| AES-256-GCM | - | 对称加密算法，用于API Key加密 |

### 14.3 飞书API权限清单

| 权限名称 | 权限说明 | 用途 | 必要性 |
|---------|---------|-----|-------|
| im:message:send_as_bot | 发送消息 | 回复用户消息 | 必须 |
| im:message:receive_v1 | 接收消息 | 接收用户消息 | 必须 |
| docx:document:readonly | 文档只读 | 读取文档内容 | 必须 |
| docx:document:create | 文档创建 | 创建新文档 | 必须 |
| drive:drive:readonly | 云文档只读 | 获取文档列表 | 必须 |
| drive:folder:readonly | 文件夹只读 | 获取文件夹信息 | 必须 |
| docx:document.write | 文档写入 | 创建文档内容 | 必须 |
| bitable:app:readonly | 多维表格只读 | 读取多维表格 | 建议 |
| im:chat:readonly | 群聊只读 | 获取群信息 | 建议 |

### 14.4 环境变量配置模板

```bash
# .env.example - 完整配置模板

# ==================== 飞书配置 ====================
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
FEISHU_BOT_NAME=AI_Feishu
FEISHU_VERIFICATION_TOKEN=           # 回调验证Token（可选）
FEISHU_ENCRYPT_KEY=                  # 回调加密Key（可选）

# ==================== MCP配置 ====================
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_TOKEN=
MCP_FALLBACK_ENABLED=true            # MCP不可用时是否降级到原生API

# ==================== LLM配置 ====================
# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-4o

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxx
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022

# Google Gemini
GEMINI_API_KEY=xxxxxxxxxxxxxx
GEMINI_BASE_URL=https://generativelanguage.googleapis.com

# Ollama (本地)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3

# ==================== Embedding配置 ====================
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# ==================== 系统配置 ====================
PORT=3000
ADMIN_PORT=3001
LOG_LEVEL=info
NODE_ENV=development
ADMIN_API_SECRET=                    # Admin API访问密钥（必填）

# ==================== 知识库配置 ====================
KB_FOLDER_URLS=                      # 逗号分隔的飞书文件夹URL
KB_SYNC_INTERVAL=3600                 # 同步间隔（秒）
KB_CHUNK_SIZE=500                    # 分块大小（token）
KB_CHUNK_OVERLAP=50                  # 分块重叠（token）
THREAD_MESSAGE_LIMIT=20             # Thread内保留消息轮数
MAX_RETRIEVAL_CHUNKS=5              # 最多注入检索结果数
MAX_MESSAGE_LENGTH=10000            # 单消息最大字符数

# ==================== 安全配置 ====================
ALLOWED_FEISHU_USERS=               # 允许使用的用户ID，逗号分隔，为空则允许所有人
ENCRYPTION_KEY=                     # AES-256-GCM加密密钥（32字节hex）

# ==================== 存储配置 ====================
DATA_DIR=./data
VECTOR_DB_PATH=./data/vectors
SQLITE_PATH=./data/config.db
```

---

**文档结束**

*本PRD为AI_Feishu Phase 1 MVP完整产品规格说明，后续开发请以此为准。如有疑问请联系产品负责人。*

*修订日志:*
- *v1.1: 修正飞书卡片JSON格式为官方标准、修正LanceDB Schema类型、补充MCP降级策略、补充Thread模型定义、补充上下文管理策略、补充多租户说明、补充安全加固章节、补充日志可观测性章节、补充部署运维章节、锁定技术栈版本*
