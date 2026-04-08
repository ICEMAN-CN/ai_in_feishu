# 飞书多AI统一接入与知识库平台 - MVP产品需求文档

**文档版本**：v1.0 MVP版
**文档日期**：2026年4月8日
**文档状态**：初稿待评审
**目标读者**：开发团队、AI Agent、实施工程师

---

## 一、产品概述

### 1.1 产品定位

> **"飞书里的AI中枢"** —— 轻量、简单、安全的个人AI知识助手

本产品是一个基于飞书开放平台的个人AI知识管理工具，核心价值主张为：

1. **多AI一站式接入**：一个入口，调用所有主流AI模型（Gemini、Grok、豆包、Qwen等），无需切换多个App
2. **飞书文档深度集成**：AI可读取飞书文档作为上下文，生成内容可一键写回飞书
3. **轻量、安全、可控**：本地部署，数据完全自主；WebSocket直连，无需公网IP

### 1.2 核心功能范围（MVP）

本次MVP版本聚焦以下核心功能，不做任何扩展：

| 模块 | P0功能 | 状态 |
|------|--------|------|
| 飞书Bot层 | 消息接收/发送、WebSocket长连接 | 待开发 |
| AI对话 | 多模型切换（4个模型）、多轮对话上下文 | 待开发 |
| 知识库 | 飞书文档读取、向量存储与检索（RAG） | 待开发 |
| 配置管理 | 模型配置、基础设置界面 | 待开发 |

### 1.3 目标用户

| 用户类型 | 描述 | 占比 |
|----------|------|------|
| 重度知识工作者 | 互联网产品经理、高级工程师、咨询顾问 | 50% |
| 技术开发者 | 全栈开发者、AI工程师、开源爱好者 | 25% |
| 中小企业团队 | 10-100人团队，有知识管理需求 | 25% |

### 1.4 成功标准（MVP）

| 指标 | 目标值 | 衡量方式 |
|------|--------|----------|
| Bot稳定性 | 消息收发正常，无崩溃 | 7x24小时运行测试 |
| 模型切换 | 4个模型可正常切换调用 | 功能测试 |
| 文档读取 | 飞书文档内容正确解析并作为上下文 | 单元测试 |
| RAG检索 | 基于文档的问答返回正确结果 | 集成测试 |
| 用户试用 | 50+用户体验，满意度>3.5/5 | 用户反馈 |

---

## 二、用户故事与功能需求

### 2.1 用户故事总览

```
作为一名[飞书重度用户]，
我希望[在飞书中直接使用多个AI模型进行问答]，
以便[无需切换应用，享受连贯的AI对话体验]。

作为一名[知识管理者]，
我希望[AI能够读取我的飞书文档作为上下文]，
以便[获得更准确、更贴合我工作场景的回答]。

作为一名[注重隐私的用户]，
我希望[所有对话记录和知识库存储在本地]，
以便[数据完全自主可控，不泄露给第三方]。
```

### 2.2 功能清单与优先级

#### P0 - 必须有（MVP核心）

##### F01：飞书Bot消息收发

**用户故事**：
```
作为用户，我希望在飞书私聊或群聊中@我的Bot并发送消息，
以便获得AI的智能回复。
```

**功能描述**：
- 支持私聊和群聊两种模式
- 接收文本消息，回复文本消息
- 支持@触发（群聊场景）
- 消息去重和幂等处理

**验收标准**：
- [ ] 用户发送"你好"，Bot在3秒内回复
- [ ] 私聊和群聊均可正常工作
- [ ] 重复消息不会导致重复回复

**技术实现要点**：
```go
// 消息处理流程
1. 飞书WebSocket推送消息事件
2. 解析消息类型（text/image/file等）
3. 基础校验（去重、权限检查）
4. 路由到对应的处理函数
5. 调用AI服务获取回复
6. 通过飞书API发送回复消息
```

##### F02：多AI模型切换

**用户故事**：
```
作为用户，我希望通过简单的命令切换不同的AI模型，
以便根据不同场景选择最合适的AI能力。
```

**功能描述**：
- 支持4个AI模型：Gemini 2.0、Grok-2、豆包v3、Qwen2.5
- 默认模型可通过配置设置
- 模型切换命令：`/model [模型名]` 或 `@Bot /model [模型名]`
- 模型切换后，下一轮对话使用新模型

**命令格式定义**：

| 命令 | 功能 | 示例 |
|------|------|------|
| `/model` | 查看当前可用模型 | `/model` |
| `/model gemini` | 切换到Gemini模型 | `/model gemini` |
| `/model grok` | 切换到Grok模型 | `/model grok` |
| `/model doubao` | 切换到豆包模型 | `/model doubao` |
| `/model qwen` | 切换到Qwen模型 | `/model qwen` |
| `/help` | 查看帮助信息 | `/help` |

**验收标准**：
- [ ] 执行`/model`显示当前模型和可用模型列表
- [ ] 执行`/model gemini`后，新消息使用Gemini模型回复
- [ ] 模型切换后之前的对话上下文保持一致

**技术实现要点**：
```go
// 模型配置结构
type ModelConfig struct {
    Name       string `json:"name"`       // 模型名称
    Provider   string `json:"provider"`   // 提供商
    Endpoint   string `json:"endpoint"`   // API端点
    APIKey     string `json:"api_key"`    // API密钥（加密存储）
    MaxTokens  int    `json:"max_tokens"` // 最大token数
    Temperature float64 `json:"temperature"` // 温度参数
}

// 默认模型列表
var DefaultModels = []ModelConfig{
    {Name: "gemini-2.0-flash", Provider: "google", Endpoint: "https://generativelanguage.googleapis.com/v1beta"},
    {Name: "grok-2", Provider: "xai", Endpoint: "https://api.x.ai/v1"},
    {Name: "doubao-pro-32k", Provider: "bytedance", Endpoint: "https://ark.cn-beijing.volces.com/api/v3"},
    {Name: "qwen2.5-72b-instruct", Provider: "aliyun", Endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1"},
}
```

##### F03：多轮对话上下文

**用户故事**：
```
作为用户，我希望AI能够记住之前的对话内容，
以便进行连贯的多轮交流，而不是每次都需要重新解释背景。
```

**功能描述**：
- 支持同一对话线程内的多轮对话
- 对话上下文保存最近10轮（可配置）
- 支持开启新对话：`/new` 或 `/new [对话标题]`
- 每个用户维护独立的对话历史

**验收标准**：
- [ ] 连续对话时AI能够理解上下文
- [ ] 执行`/new`后开启新对话，旧对话被保存
- [ ] 不同用户的对话历史相互隔离

**技术实现要点**：
```go
// 对话上下文结构
type ConversationContext struct {
    UserID          string            `json:"user_id"`          // 用户ID
    ConversationID  string            `json:"conversation_id"` // 对话ID
    ModelName       string            `json:"model_name"`       // 当前模型
    Messages        []ChatMessage     `json:"messages"`         // 消息历史
    CreatedAt       time.Time         `json:"created_at"`       // 创建时间
    UpdatedAt       time.Time         `json:"updated_at"`       // 更新时间
}

type ChatMessage struct {
    Role    string    `json:"role"`    // user/assistant/system
    Content string    `json:"content"` // 消息内容
    Time    time.Time `json:"time"`    // 发送时间
}
```

##### F04：飞书文档读取

**用户故事**：
```
作为用户，我希望AI能够读取我的飞书文档内容，
以便基于文档内容回答我的问题，而不是凭空编造。
```

**功能描述**：
- 支持读取用户指定的飞书文档
- 命令格式：`@Bot 阅读 [文档链接或名称]`
- 文档内容被提取并作为上下文传递给AI
- 支持飞书原生文档格式（.docx解析）

**验收标准**：
- [ ] 用户发送文档链接，Bot能正确提取文档内容
- [ ] 提取的内容被正确拼接到AI上下文中
- [ ] 文档读取失败时返回友好错误提示

**技术实现要点**：
```go
// 飞书文档读取流程
1. 解析用户消息中的文档链接或名称
2. 调用飞书API获取文档元信息
3. 使用lark-oapi的文档API读取文档内容
4. 对文档内容进行预处理（去除格式、截断等）
5. 将文档内容注入到AI请求的system prompt中
6. 返回AI基于文档内容的回答

// 文档内容注入示例
func BuildDocumentContext(docContent string) string {
    return fmt.Sprintf("【参考文档内容】\n%s\n【文档内容结束】", docContent)
}
```

##### F05：RAG知识库检索

**用户故事**：
```
作为用户，我希望基于我的飞书文档向AI提问，
以便快速从大量文档中找到所需信息。
```

**功能描述**：
- 文档内容自动向量化存储到Chroma
- 用户提问时，先检索相关文档片段
- 将检索结果作为上下文，生成回答
- 命令格式：`@Bot 搜索 [关键词]` 或 直接提问（自动检索）

**验收标准**：
- [ ] 上传的文档能够被正确分词和向量化
- [ ] 检索结果返回相关内容片段
- [ ] AI回答基于检索结果，而非凭空生成

**技术实现要点**：
```go
// RAG检索流程
1. 用户发送问题
2. 将问题向量化（使用embedding模型）
3. 在Chroma中检索最相关的Top-K文档片段
4. 将检索结果拼接为上下文
5. 将上下文+问题一起发送给AI
6. 返回基于上下文的回答

// 向量化配置
const (
    EmbeddingModel = "text-embedding-3-small" // OpenAI兼容的embedding模型
    RetrievalTopK  = 5                          // 检索返回数量
    ChunkSize      = 500                        // 分块大小（字符数）
    ChunkOverlap   = 50                         // 分块重叠大小
)
```

#### P1 - 应该有（成长阶段）

##### F06：对话历史管理

**功能描述**：
- 查看历史对话列表：`/history`
- 查看特定对话详情：`/history [对话ID]`
- 删除对话：`/delete [对话ID]`
- 对话数据存储在SQLite本地数据库

##### F07：飞书文档写入

**功能描述**：
- AI生成内容可写入飞书文档
- 命令格式：`@Bot 写入 [文档标题]` + 内容
- 或使用回复触发：AI回复后输入`/write [文档标题]`

##### F08：配置管理界面

**功能描述**：
- Web界面管理AI模型配置
- 查看API使用统计
- 管理知识库（查看索引状态、手动触发重新索引等）

### 2.3 交互流程设计

#### 2.3.1 典型对话流程

```
用户                    Bot                       AI服务
  │                      │                          │
  │  发送消息            │                          │
  │─────────────────────>│                          │
  │                      │                          │
  │                      │  解析命令                 │
  │                      │────────                   │
  │                      │    │                     │
  │                      │<───────┘                 │
  │                      │                          │
  │                      │  若是文档命令             │
  │                      │────────                  │
  │                      │    │  读取飞书文档         │
  │                      │<───────┘                 │
  │                      │                          │
  │                      │  构建上下文              │
  │                      │─────────────────────────>│
  │                      │    │                     │
  │                      │    │  AI回复              │
  │                      │<─────────────────────────│
  │                      │                          │
  │  收到回复            │                          │
  │<─────────────────────│                          │
  │                      │                          │
```

#### 2.3.2 RAG检索流程

```
用户问题
    │
    ▼
┌─────────────────────┐
│  1. 问题向量化       │
│     (embedding API) │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  2. Chroma向量检索   │
│     (top-K=5)       │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  3. 上下文组装       │
│     (文档片段拼接)   │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  4. AI生成回答       │
│     (带RAG上下文)   │
└─────────────────────┘
    │
    ▼
   回复用户
```

### 2.4 消息格式设计

#### 2.4.1 文本消息

Bot回复使用飞书文本消息，支持Markdown格式：

```json
{
    "msg_type": "text",
    "content": {
        "text": "**Gemini 模型**已激活\n\n有什么我可以帮你的吗？"
    }
}
```

#### 2.4.2 交互卡片（可选）

复杂场景使用飞书交互卡片：

```json
{
    "msg_type": "interactive",
    "card": {
        "header": {
            "title": {
                "tag": "plain_text",
                "content": "AI 回答"
            },
            "template": "blue"
        },
        "elements": [
            {
                "tag": "markdown",
                "content": "基于您上传的文档，我整理了以下要点..."
            }
        ]
    }
}
```

---

## 三、信息架构与数据结构

### 3.1 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           飞书客户端                                 │
│                    (iOS / Android / PC / Mac / Web)                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 飞书消息协议 (WebSocket)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        飞书开放平台 Bot Layer                        │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   消息接收模块   │  │   消息发送模块   │  │   事件处理模块   │   │
│  │   (WS Client)   │  │   (Lark API)    │  │  (event handler) │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                      │
│                         lark-oapi Go SDK                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 内部HTTP/gRPC调用
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           应用服务层 (Go)                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                         核心服务组件                           │   │
│  │                                                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │   │
│  │  │  会话管理   │  │  上下文管理  │  │  知识检索   │             │   │
│  │  │  Service   │  │  Service   │  │  Service   │             │   │
│  │  │             │  │             │  │  (RAG)     │             │   │
│  │  └────────────┘  └────────────┘  └────────────┘             │   │
│  │                                                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │   │
│  │  │  文档处理   │  │  模型路由   │  │  配置管理   │             │   │
│  │  │  Service   │  │  Service   │  │  Service   │             │   │
│  │  └────────────┘  └────────────┘  └────────────┘             │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│      LiteLLM        │ │       Chroma        │ │       SQLite        │
│    (多模型网关)      │ │    (向量数据库)      │ │    (结构化存储)      │
│                     │ │                     │ │                     │
│  ┌────────────────┐ │ │  ┌────────────────┐ │ │  ┌────────────────┐ │
│  │  Gemini 2.0    │ │ │  │  向量索引       │ │ │  │  用户配置      │ │
│  │  Grok-2        │ │ │  │  (HNSW)        │ │ │  │  对话历史      │ │
│  │  豆包v3        │ │ │  └────────────────┘ │ │  │  文档元数据    │ │
│  │  Qwen2.5       │ │ │                     │ │  └────────────────┘ │
│  └────────────────┘ │ └─────────────────────┘ └─────────────────────┘
└─────────────────────┘
```

### 3.2 目录结构

```
feishu-ai-knowledge/
├── cmd/                          # 程序入口
│   └── server/
│       └── main.go               # 主程序
├── config/                       # 配置模块
│   ├── config.go                 # 配置加载
│   └── model.go                  # 配置结构
├── internal/                     # 内部包
│   ├── handler/                  # 处理器
│   │   ├── message.go            # 消息处理
│   │   ├── command.go            # 命令处理
│   │   └── callback.go           # 回调处理
│   ├── service/                  # 业务服务
│   │   ├── chat.go               # 对话服务
│   │   ├── session.go            # 会话管理
│   │   ├── document.go           # 文档服务
│   │   ├── rag.go                # RAG服务
│   │   └── model.go              # 模型路由
│   ├── repository/               # 数据层
│   │   ├── sqlite.go             # SQLite操作
│   │   ├── chroma.go             # Chroma操作
│   │   └── lark.go               # 飞书API操作
│   └── model/                    # 数据模型
│       ├── message.go            # 消息模型
│       ├── session.go             # 会话模型
│       └── document.go           # 文档模型
├── pkg/                          # 公共包
│   ├── lark/                     # 飞书SDK封装
│   ├── lite llm/                 # LiteLLM客户端
│   └── chroma/                   # Chroma客户端
├── scripts/                      # 脚本
│   └── init_db.sql               # 数据库初始化
├── go.mod                        # Go模块
├── go.sum                        # 依赖校验
├── Dockerfile                    # Docker镜像
└── README.md                     # 项目说明
```

### 3.3 数据库设计（SQLite）

#### 3.3.1 ER图

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    users        │       │  conversations  │       │    documents    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │       │ id (PK)         │
│ feishu_user_id  │  │    │ user_id (FK)   │←──────│ user_id (FK)    │
│ username        │  │    │ title          │       │ lark_doc_token  │
│ default_model   │  │    │ model          │       │ title           │
│ created_at      │  │    │ created_at     │       │ content_hash    │
│ updated_at      │  │    │ updated_at     │       │ indexed_at      │
└─────────────────┘  │    └─────────────────┘       │ created_at      │
                     │           │                   └─────────────────┘
                     │           │
                     │           ▼
                     │    ┌─────────────────┐
                     │    │    messages     │
                     │    ├─────────────────┤
                     └───→│ id (PK)         │
                          │ conv_id (FK)    │←──────┐
                          │ role            │       │
                          │ content         │       │
                          │ tokens          │       │
                          │ model          │       │
                          │ created_at     │       │
                          └─────────────────┘       │
                                                     │
                          ┌─────────────────┐         │
                          │   rag_chunks   │         │
                          ├─────────────────┤         │
                          │ id (PK)         │─────────┘
                          │ doc_id (FK)     │
                          │ content         │
                          │ embedding       │
                          │ chunk_index     │
                          │ created_at      │
                          └─────────────────┘
```

#### 3.3.2 表结构定义

```sql
-- 用户配置表
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    feishu_user_id  TEXT UNIQUE NOT NULL COMMENT '飞书用户ID',
    username        TEXT NOT NULL COMMENT '用户名',
    default_model   TEXT DEFAULT 'gemini-2.0-flash' COMMENT '默认模型',
    config          TEXT COMMENT '用户配置JSON',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_feishu_id ON users(feishu_user_id);

-- 对话会话表
CREATE TABLE IF NOT EXISTS conversations (
    id              TEXT PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    title           TEXT,
    model           TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_conv_user ON conversations(user_id);
CREATE INDEX idx_conv_updated ON conversations(updated_at);

-- 消息记录表
CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conv_id         TEXT NOT NULL,
    role            TEXT NOT NULL COMMENT 'user/assistant/system',
    content         TEXT NOT NULL,
    tokens          INTEGER,
    model           TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conv_id) REFERENCES conversations(id)
);

CREATE INDEX idx_msg_conv ON messages(conv_id);
CREATE INDEX idx_msg_created ON messages(created_at);

-- 文档记录表
CREATE TABLE IF NOT EXISTS documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    lark_doc_token  TEXT NOT NULL COMMENT '飞书文档token',
    title           TEXT,
    content_hash    TEXT COMMENT '内容哈希，用于检测更新',
    status          TEXT DEFAULT 'pending' COMMENT 'pending/indexed/failed',
    error_msg       TEXT,
    indexed_at      DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, lark_doc_token)
);

CREATE INDEX idx_doc_user ON documents(user_id);
CREATE INDEX idx_doc_status ON documents(status);

-- RAG分块表
CREATE TABLE IF NOT EXISTS rag_chunks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id          INTEGER NOT NULL,
    content         TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL,
    vector_id       TEXT COMMENT 'Chroma中的向量ID',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_chunk_doc ON rag_chunks(doc_id);
CREATE INDEX idx_chunk_vector ON rag_chunks(vector_id);

-- 模型调用日志表（用于统计和计费）
CREATE TABLE IF NOT EXISTS model_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    conv_id         TEXT,
    model           TEXT NOT NULL,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    cost            REAL COMMENT '预估成本(元)',
    latency_ms      INTEGER COMMENT '响应延迟(毫秒)',
    status          TEXT COMMENT 'success/failed',
    error_msg       TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_log_user ON model_logs(user_id);
CREATE INDEX idx_log_created ON model_logs(created_at);
```

### 3.4 API设计

#### 3.4.1 内部HTTP API

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | /api/v1/chat | 发送消息 | ChatRequest | ChatResponse |
| GET | /api/v1/conversations | 获取会话列表 | - | ConversationList |
| GET | /api/v1/conversations/:id | 获取会话详情 | - | ConversationDetail |
| DELETE | /api/v1/conversations/:id | 删除会话 | - | - |
| POST | /api/v1/documents | 添加文档 | DocumentRequest | Document |
| GET | /api/v1/documents | 获取文档列表 | - | DocumentList |
| DELETE | /api/v1/documents/:id | 删除文档 | - | - |
| POST | /api/v1/documents/:id/reindex | 重新索引 | - | - |
| GET | /api/v1/config/models | 获取模型配置 | - | ModelConfigList |
| PUT | /api/v1/config/models/:name | 更新模型配置 | ModelConfig | ModelConfig |
| GET | /api/v1/stats | 获取使用统计 | - | UsageStats |

#### 3.4.2 请求/响应结构

```go
// ChatRequest - 对话请求
type ChatRequest struct {
    UserID      string   `json:"user_id"`
    Message     string   `json:"message"`
    Model      string   `json:"model,omitempty"`   // 可选，不传则使用默认模型
    ConvID     string   `json:"conv_id,omitempty"` // 可选，不传则创建新对话
}

// ChatResponse - 对话响应
type ChatResponse struct {
    ConvID     string   `json:"conv_id"`
    MessageID  string   `json:"message_id"`
    Content    string   `json:"content"`
    Model      string   `json:"model"`
    Tokens     int      `json:"tokens"`
    LatencyMs int      `json:"latency_ms"`
}

// ConversationList - 会话列表
type ConversationList struct {
    Items      []Conversation `json:"items"`
    Total      int            `json:"total"`
    Page       int            `json:"page"`
    PageSize   int            `json:"page_size"`
}

// Conversation - 会话信息
type Conversation struct {
    ID         string    `json:"id"`
    Title      string    `json:"title"`
    Model      string    `json:"model"`
    MessageCnt int       `json:"message_cnt"`
    CreatedAt  time.Time `json:"created_at"`
    UpdatedAt  time.Time `json:"updated_at"`
}

// Document - 文档信息
type Document struct {
    ID            int64     `json:"id"`
    LarkDocToken  string    `json:"lark_doc_token"`
    Title         string    `json:"title"`
    Status        string    `json:"status"`
    ChunkCount    int       `json:"chunk_count"`
    IndexedAt     time.Time `json:"indexed_at,omitempty"`
    CreatedAt     time.Time `json:"created_at"`
}

// ModelConfig - 模型配置
type ModelConfig struct {
    Name        string  `json:"name"`
    Provider    string  `json:"provider"`
    Endpoint    string  `json:"endpoint"`
    APIKey      string  `json:"-"` // 不在响应中返回
    MaxTokens   int     `json:"max_tokens"`
    Temperature float64 `json:"temperature"`
    Enabled     bool    `json:"enabled"`
}
```

---

## 四、技术架构详解

### 4.1 技术栈总览

| 层级 | 技术选型 | 版本要求 | 说明 |
|------|----------|----------|------|
| Bot框架 | lark-oapi | ≥1.5.0 | 飞书官方Go SDK |
| 应用框架 | Go标准库 + gorrouter | - | 轻量级路由 |
| 多模型网关 | LiteLLM | ≥1.40.0 | 统一接入100+模型 |
| 向量数据库 | Chroma | ≥0.4.0 | 本地向量存储 |
| 关系数据库 | SQLite | 3.x | 结构化数据存储 |
| Embedding | OpenAI API (text-embedding-3-small) | - | 向量化服务 |
| 配置管理 | viper | ≥1.18.0 | 配置加载 |
| 日志 | zap | ≥1.26.0 | 结构化日志 |
| Web服务 | net/http | - | 标准库 |

### 4.2 核心组件设计

#### 4.2.1 消息处理管道

```go
// MessagePipeline 消息处理管道
type MessagePipeline struct {
    handlers []MessageHandler
}

type MessageHandler interface {
    Handle(ctx *MessageContext) error
    Priority() int
}

// 处理流程
// 1. WSClient 接收飞书消息
// 2. EventHandler 解析消息事件
// 3. MessagePipeline 按优先级执行Handler
//    - DuplicateFilterHandler (去重)
//    - CommandHandler (命令解析)
//    - AuthHandler (权限校验)
//    - RAGHandler (知识检索，如需要)
//    - ChatHandler (AI对话)
//    - ReplyHandler (发送回复)
// 4. 消息被持久化到SQLite
```

#### 4.2.2 会话管理

```go
// SessionManager 会话管理器
type SessionManager struct {
    cache   *ristretto.Cache[string, *ConversationContext] // 本地缓存
    repo    *SessionRepository                             // 持久化层
}

func (sm *SessionManager) GetOrCreate(ctx *MessageContext) (*ConversationContext, error) {
    // 1. 检查缓存
    if cached, ok := sm.cache.Get(ctx.ConvID); ok {
        return cached, nil
    }

    // 2. 从数据库加载
    session, err := sm.repo.GetByID(ctx.ConvID)
    if err != nil {
        return nil, err
    }

    // 3. 加载最近消息
    messages, err := sm.repo.GetRecentMessages(ctx.ConvID, 10)
    if err != nil {
        return nil, err
    }
    session.Messages = messages

    // 4. 加入缓存
    sm.cache.Set(ctx.ConvID, session, 1)

    return session, nil
}

func (sm *SessionManager) AppendMessage(ctx *MessageContext, msg *ChatMessage) error {
    // 1. 追加到会话
    session, err := sm.GetOrCreate(ctx)
    if err != nil {
        return err
    }
    session.Messages = append(session.Messages, msg)

    // 2. 截断过长的上下文（保留最近10轮）
    if len(session.Messages) > 20 { // 10轮对话 = 20条消息
        session.Messages = session.Messages[len(session.Messages)-20:]
    }

    // 3. 持久化
    if err := sm.repo.SaveMessage(ctx.ConvID, msg); err != nil {
        return err
    }

    // 4. 更新缓存
    sm.cache.Set(ctx.ConvID, session, 1)

    return nil
}
```

#### 4.2.3 模型路由

```go
// ModelRouter 模型路由器
type ModelRouter struct {
    liteLLMEndpoint string
    apiKeys         map[string]string // 模型名称 -> API Key
    defaultModel    string
}

func (mr *ModelRouter) Call(ctx *ConversationContext, userMessage string) (*ModelResponse, error) {
    // 1. 构建消息列表
    messages := mr.buildMessages(ctx, userMessage)

    // 2. 调用LiteLLM
    req := &LLMRequest{
        Model:       ctx.ModelName,
        Messages:    messages,
        MaxTokens:   2048,
        Temperature: 0.7,
    }

    resp, err := mr.callLiteLLM(req)
    if err != nil {
        return nil, fmt.Errorf("llm call failed: %w", err)
    }

    return resp, nil
}

func (mr *ModelRouter) buildMessages(ctx *ConversationContext, userMessage string) []Message {
    var messages []Message

    // 1. System prompt
    messages = append(messages, Message{
        Role:    "system",
        Content: "你是用户的AI助手，名字叫飞AI。你功能强大，但回复简洁专业。",
    })

    // 2. 对话历史（最近10轮）
    for _, msg := range ctx.Messages {
        messages = append(messages, Message{
            Role:    msg.Role,
            Content: msg.Content,
        })
    }

    // 3. 当前用户消息
    messages = append(messages, Message{
        Role:    "user",
        Content: userMessage,
    })

    return messages
}

// LiteLLM API调用
func (mr *ModelRouter) callLiteLLM(req *LLMRequest) (*ModelResponse, error) {
    // 使用OpenAI兼容格式调用LiteLLM
    // POST ${LITELLM_ENDPOINT}/v1/chat/completions
    // Headers: Authorization: Bearer ${LITELLM_API_KEY}
}
```

#### 4.2.4 RAG服务

```go
// RAGService RAG服务
type RAGService struct {
    chromaClient *chroma.Client
    embeddingSvc *EmbeddingService
    chunkSize    int
    chunkOverlap int
}

type检索结果 struct {
    DocID     int64
    Content   string
    Score     float32
}

// Retrieve 检索相关文档
func (rs *RAGService) Retrieve(query string, topK int) ([]检索结果, error) {
    // 1. 将查询向量化
    queryEmbedding, err := rs.embeddingSvc.Embed(query)
    if err != nil {
        return nil, fmt.Errorf("embedding failed: %w", err)
    }

    // 2. 在Chroma中检索
    results, err := rs.chromaClient.Query(检索参数{
        QueryEmbeddings: [][]float32{queryEmbedding},
        NResults:        topK,
    })
    if err != nil {
        return nil, fmt.Errorf("chroma query failed: %w", err)
    }

    // 3. 解析结果
    var检索结果s []检索结果
    for i, result := range results[0] {
       检索结果s = append(检索结果s, 检索结果{
            DocID:   result.ID.(int64),
            Content: result.Document,
            Score:   result.Distance,
        })
    }

    return检索结果s, nil
}

// IndexDocument 索引文档
func (rs *RAGService) IndexDocument(docID int64, content string) error {
    // 1. 文本分块
    chunks := rs.splitChunks(content)

    // 2. 批量向量化
    embeddings, err := rs.embeddingSvc.EmbedBatch(chunks)
    if err != nil {
        return fmt.Errorf("batch embedding failed: %w", err)
    }

    // 3. 存储到Chroma
    for i, chunk := range chunks {
        err := rs.chromaClient.Add(chroma.AddRequest{
            IDs:       []string{fmt.Sprintf("%d_%d", docID, i)},
            Documents: []string{chunk},
            Embeddings: [][]float32{embeddings[i]},
            Metadata:   map[string]interface{}{"doc_id": docID, "chunk_index": i},
        })
        if err != nil {
            return fmt.Errorf("chroma add failed: %w", err)
        }
    }

    return nil
}

// splitChunks 文本分块
func (rs *RAGService) splitChunks(content string) []string {
    var chunks []string
    runes := []rune(content)
    start := 0

    for start < len(runes) {
        end := start + rs.chunkSize
        if end > len(runes) {
            end = len(runes)
        }

        // 在句子边界处截断
        if end < len(runes) {
            for end > start && runes[end-1] != '。' && runes[end-1] != '！' && runes[end-1] != '？' && runes[end-1] != '\n' {
                end--
            }
            if end == start {
                end = start + rs.chunkSize
            }
        }

        chunks = append(chunks, string(runes[start:end]))
        start = end - rs.chunkOverlap
    }

    return chunks
}
```

### 4.3 配置设计

#### 4.3.1 配置文件结构

```yaml
# config.yaml
app:
  name: "feishu-ai-knowledge"
  host: "0.0.0.0"
  port: 8080
  log_level: "info"  # debug/info/warn/error
  data_dir: "./data"  # 数据存储目录

feishu:
  app_id: "${FEISHU_APP_ID}"
  app_secret: "${FEISHU_APP_SECRET}"
  bot_name: "飞AI"

lite_llm:
  endpoint: "http://localhost:4000/v1"  # LiteLLM服务地址
  api_key: "${LITELLM_API_KEY}"

chroma:
  persist_dir: "./data/chroma"

models:
  - name: "gemini-2.0-flash"
    provider: "google"
    enabled: true
  - name: "grok-2"
    provider: "xai"
    enabled: true
  - name: "doubao-pro-32k"
    provider: "bytedance"
    enabled: true
  - name: "qwen2.5-72b-instruct"
    provider: "aliyun"
    enabled: true

rag:
  embedding_model: "text-embedding-3-small"
  chunk_size: 500
  chunk_overlap: 50
  top_k: 5
```

#### 4.3.2 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| FEISHU_APP_ID | 是 | 飞书应用App ID |
| FEISHU_APP_SECRET | 是 | 飞书应用App Secret |
| LITELLM_API_KEY | 是 | LiteLLM API Key |
| GOOGLE_API_KEY | 否 | Gemini API Key（通过LiteLLM也可） |
| XAI_API_KEY | 否 | xAI API Key |

### 4.4 飞书Bot集成

#### 4.4.1 WebSocket长连接模式

```go
// FeishuWSClient 飞书WebSocket客户端
type FeishuWSClient struct {
    appID      string
    appSecret  string
    wsEndpoint string
    client     *lark.Client
    handlers   []EventHandler
}

func NewFeishuWSClient(appID, appSecret string) (*FeishuWSClient, error) {
    client := lark.NewClient(appID, appSecret)

    return &FeishuWSClient{
        appID:     appID,
        appSecret: appSecret,
        client:    client,
    }, nil
}

func (c *FeishuWSClient) Connect(ctx context.Context) error {
    // 1. 获取tenant_access_token
    token, err := c.client.GetTenantAccessToken(ctx)
    if err != nil {
        return fmt.Errorf("get token failed: %w", err)
    }

    // 2. 建立WebSocket连接
    wsClient, err := c.client.GetWSClient(lark.WSConfig{
        Token: token,
    })
    if err != nil {
        return fmt.Errorf("get ws client failed: %w", err)
    }

    // 3. 启动事件监听
    go c.listenEvents(ctx, wsClient)

    return nil
}

func (c *FeishuWSClient) listenEvents(ctx context.Context, wsClient *lark.WSClient) {
    for {
        select {
        case <-ctx.Done():
            return
        case event := <-wsClient.EventChan():
            c.handleEvent(ctx, event)
        }
    }
}

func (c *FeishuWSClient) handleEvent(ctx context.Context, event *lark.Event) {
    // 根据事件类型分发到不同Handler
    switch event.Type {
    case lark.EventTypeReceiveMessage:
        c.handleMessageEvent(ctx, event)
    case lark.EventTypeBotOpened:
        c.handleBotOpenedEvent(ctx, event)
    case lark.EventTypeBotClosed:
        c.handleBotClosedEvent(ctx, event)
    }
}
```

#### 4.4.2 消息发送

```go
// SendReply 发送回复消息
func (c *FeishuWSClient) SendReply(ctx context.Context, openID string, messageID string, content string) error {
    // 使用回复卡片格式
    card := lark.NewCardBuilder().
        Header(lark.CardHeader{
            Title: &lark.CardTitle{
                Tag:     "plain_text",
                Content: "飞AI 助手",
            },
        }).
        Element(lark.CardMarkdown{
            Content: content,
        }).
        Build()

    return c.client.Message().Send().
        ReceiveID(openID).
        MsgID(messageID).
        Card(card).
        Do(ctx)
}
```

---

## 五、接口设计

### 5.1 飞书Bot命令接口

| 命令 | 功能 | 示例 |
|------|------|------|
| `/model [name]` | 切换AI模型 | `/model gemini` |
| `/model` | 查看当前模型 | `/model` |
| `/new [title]` | 开始新对话 | `/new 项目方案讨论` |
| `/history` | 查看历史对话 | `/history` |
| `/delete [id]` | 删除对话 | `/delete abc123` |
| `/search [query]` | 搜索知识库 | `/search 飞书文档接口` |
| `/read [doc_url]` | 读取飞书文档 | `/read https://xxx.feishu.cn/docx/xxx` |
| `/help` | 获取帮助 | `/help` |
| `/stats` | 查看使用统计 | `/stats` |

### 5.2 Web API接口

#### 5.2.1 对话接口

**POST /api/v1/chat**

发送消息进行对话

Request:
```json
{
    "user_id": "ou_xxx",
    "message": "基于我上传的飞书文档，帮我总结一下项目的技术方案",
    "model": "gemini-2.0-flash",
    "conv_id": "conv_xxx"
}
```

Response:
```json
{
    "conv_id": "conv_xxx",
    "message_id": "msg_xxx",
    "content": "根据您上传的文档，技术方案主要包括以下几部分...",
    "model": "gemini-2.0-flash",
    "tokens": 1523,
    "latency_ms": 1234
}
```

#### 5.2.2 会话管理接口

**GET /api/v1/conversations**

获取会话列表

Response:
```json
{
    "items": [
        {
            "id": "conv_xxx",
            "title": "项目方案讨论",
            "model": "gemini-2.0-flash",
            "message_cnt": 12,
            "created_at": "2026-04-08T10:00:00Z",
            "updated_at": "2026-04-08T14:30:00Z"
        }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
}
```

**DELETE /api/v1/conversations/:id**

删除会话

Response: `204 No Content`

#### 5.2.3 文档管理接口

**POST /api/v1/documents**

添加文档到知识库

Request:
```json
{
    "user_id": "ou_xxx",
    "lark_doc_token": "docx_xxx",
    "title": "项目技术方案"
}
```

Response:
```json
{
    "id": 1,
    "lark_doc_token": "docx_xxx",
    "title": "项目技术方案",
    "status": "indexing",
    "chunk_count": 0,
    "created_at": "2026-04-08T10:00:00Z"
}
```

**GET /api/v1/documents/:id**

获取文档详情

Response:
```json
{
    "id": 1,
    "lark_doc_token": "docx_xxx",
    "title": "项目技术方案",
    "status": "indexed",
    "chunk_count": 25,
    "indexed_at": "2026-04-08T10:05:00Z",
    "created_at": "2026-04-08T10:00:00Z"
}
```

**POST /api/v1/documents/:id/reindex**

重新索引文档

Response:
```json
{
    "status": "indexing",
    "message": "重新索引任务已启动"
}
```

#### 5.2.4 配置接口

**GET /api/v1/config/models**

获取可用模型列表

Response:
```json
{
    "items": [
        {
            "name": "gemini-2.0-flash",
            "provider": "google",
            "endpoint": "https://generativelanguage.googleapis.com/v1beta",
            "max_tokens": 8192,
            "temperature": 0.7,
            "enabled": true
        },
        {
            "name": "grok-2",
            "provider": "xai",
            "endpoint": "https://api.x.ai/v1",
            "max_tokens": 131072,
            "temperature": 0.7,
            "enabled": true
        }
    ],
    "default": "gemini-2.0-flash"
}
```

**PUT /api/v1/config/models/:name**

更新模型配置

Request:
```json
{
    "api_key": "xxx",
    "temperature": 0.8,
    "enabled": true
}
```

---

## 六、前端界面设计（配置管理后台）

### 6.1 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  飞AI 管理后台                                                │
├───────────────┬─────────────────────────────────────────────┤
│               │                                              │
│  📊 概览      │   主内容区                                    │
│               │                                              │
│  💬 对话记录  │   根据左侧导航显示对应内容                     │
│               │                                              │
│  📄 知识库    │                                              │
│               │                                              │
│  ⚙️ 模型配置  │                                              │
│               │                                              │
│  📈 使用统计  │                                              │
│               │                                              │
└───────────────┴─────────────────────────────────────────────┘
```

### 6.2 页面说明

#### 6.2.1 概览页面

- 显示Bot基本信息（状态、版本）
- 显示今日使用统计（对话数、消息数、Token消耗）
- 快捷操作入口

#### 6.2.2 对话记录页面

- 列表展示所有历史对话
- 支持按标题搜索
- 可查看对话详情
- 可删除对话

#### 6.2.3 知识库页面

- 列表展示已索引的文档
- 显示索引状态和分块数量
- 支持手动触发重新索引
- 支持删除文档

#### 6.2.4 模型配置页面

- 展示已配置的模型列表
- 可添加/编辑/删除模型
- 可设置默认模型
- 可配置API Key（加密存储）

#### 6.2.5 使用统计页面

- Token消耗趋势图
- 各模型使用占比
- Top用户/对话
- 导出统计数据

---

## 七、非功能性需求

### 7.1 性能需求

| 指标 | 要求 | 说明 |
|------|------|------|
| 消息响应时间 | <5秒 | 从收到消息到返回AI回复 |
| API响应时间 | <500ms | Web API（不含AI调用） |
| 并发支持 | 50+用户 | 同时使用Bot的用户数 |
| 向量检索延迟 | <100ms | 10万向量规模下的检索延迟 |

### 7.2 可用性需求

| 指标 | 要求 |
|------|------|
| 服务可用性 | 99.5% |
| 故障恢复时间 | <30分钟 |
| 数据备份 | 每日自动备份 |

### 7.3 安全需求

| 需求 | 说明 |
|------|------|
| 通信加密 | 所有HTTP通信使用TLS |
| API Key存储 | 加密存储，不明文暴露 |
| 用户隔离 | 不同用户的对话数据完全隔离 |
| 飞书回调验证 | 验证消息签名 |

### 7.4 兼容性需求

| 项目 | 要求 |
|------|------|
| 飞书客户端 | iOS/Android/PC/Mac/Web |
| 飞书版本 | 最新版本 |
| LiteLLM版本 | ≥1.40.0 |
| Go版本 | ≥1.21 |

---

## 八、开发计划

### 8.1 Sprint规划

#### Sprint 1: 基础设施（第1-2周）

**目标**：完成项目搭建、飞书Bot基础框架

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 项目结构初始化 | - | 待分配 |
| 配置文件设计 | - | 待分配 |
| SQLite数据库初始化 | - | 待分配 |
| 飞书WebSocket连接 | - | 待分配 |
| 消息接收与解析 | - | 待分配 |
| 基础消息回复 | - | 待分配 |

**交付物**：
- 飞书Bot能够接收和回复消息
- 项目目录结构完整
- 配置文件可正常加载
- 数据库表结构创建完成

#### Sprint 2: AI对话功能（第3-4周）

**目标**：完成多模型切换、多轮对话功能

| 任务 | 负责人 | 状态 |
|------|--------|------|
| LiteLLM集成 | - | 待分配 |
| 模型配置管理 | - | 待分配 |
| 对话上下文管理 | - | 待分配 |
| 多轮对话实现 | - | 待分配 |
| 命令解析（/model等） | - | 待分配 |

**交付物**：
- 支持4个AI模型切换
- 多轮对话上下文连贯
- 命令系统正常工作

#### Sprint 3: 知识库功能（第5-7周）

**目标**：完成RAG知识库、飞书文档读取

| 任务 | 负责人 | 状态 |
|------|--------|------|
| Chroma集成 | - | 待分配 |
| Embedding服务集成 | - | 待分配 |
| 文档向量化存储 | - | 待分配 |
| 飞书文档API读取 | - | 待分配 |
| RAG检索实现 | - | 待分配 |

**交付物**：
- 飞书文档可读取并向量化
- RAG检索返回相关结果
- AI回答基于知识库内容

#### Sprint 4: 管理后台与收尾（第8周）

**目标**：完成管理后台、测试、部署

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 配置管理Web界面 | - | 待分配 |
| Docker化部署 | - | 待分配 |
| 集成测试 | - | 待分配 |
| 文档编写 | - | 待分配 |
| MVP发布 | - | 待分配 |

**交付物**：
- 管理后台可用
- Docker镜像可部署
- 用户试用反馈收集

### 8.2 里程碑

| 里程碑 | 目标日期 | 交付内容 |
|--------|----------|----------|
| M1: 核心框架 | Week 2 | 飞书Bot消息收发 |
| M2: AI对话 | Week 4 | 多模型切换、多轮对话 |
| M3: 知识库 | Week 7 | RAG检索、文档读取 |
| M4: MVP发布 | Week 8 | 完整功能、对外试用 |

---

## 九、风险与应对

### 9.1 技术风险

| 风险 | 等级 | 应对策略 |
|------|------|----------|
| 飞书API变更 | 高 | 使用官方SDK，关注官方公告 |
| LiteLLM兼容性问题 | 中 | 预留抽象层，支持替换 |
| Chroma性能瓶颈 | 低 | 监控检索延迟，必要时切换 |

### 9.2 项目风险

| 风险 | 等级 | 应对策略 |
|------|------|----------|
| 开发进度延期 | 中 | 每日站会，及时暴露问题 |
| 需求变更 | 中 | 严格控制MVP范围 |
| 人员变动 | 低 | 文档完善，降低知识依赖 |

---

## 十、附录

### 10.1 术语表

| 术语 | 说明 |
|------|------|
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| HNSW | Hierarchical Navigable Small World，高效向量检索算法 |
| Embedding | 将文本转为向量表示，用于语义检索 |
| Chunk | 文档分块，将长文档分割为小段落 |
| WebSocket | 持久连接协议，用于实时通信 |

### 10.2 参考资料

| 资料 | 链接 |
|------|------|
| lark-oapi文档 | https://open.feishu.cn/document/server-docs/SDK |
| LiteLLM文档 | https://docs.litellm.ai/ |
| Chroma文档 | https://docs.trychroma.com/ |
| 飞书消息卡片 | https://open.feishu.cn/document/ukTMukTMukTM/ugTNwUjL4UDN14CO4UDN |

### 10.3 配置示例

#### 10.3.1 飞书应用配置

1. 登录飞书开放平台
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 配置机器人能力
5. 申请权限：im:message, docx:document:readonly
6. 发布应用

#### 10.3.2 LiteLLM配置

```bash
# LiteLLM启动命令
litellm --model google/gemini-1.5-flash \
        --model xai/grok-2 \
        --model bytedance/doubao-pro-32k \
        --model qwen/qwen2.5-72b-instruct
```

#### 10.3.3 Docker Compose配置

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      - FEISHU_APP_ID=${FEISHU_APP_ID}
      - FEISHU_APP_SECRET=${FEISHU_APP_SECRET}
      - LITELLM_API_KEY=${LITELLM_API_KEY}
    depends_on:
      - lite-llm

  lite-llm:
    image: ghcr.io/berriai/litellm:latest
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
```

---

**文档结束**

*本文档为MVP版本，后续迭代中持续更新*
*如有疑问请联系产品团队*
