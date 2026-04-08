# 飞书AI知识库 MVP 产品需求文档 (PRD)

**文档版本**：v1.0  
**创建日期**：2026年4月  
**文档状态**：初稿待评审  
**目标读者**：AI开发Agent、产品团队、技术架构师

---

## 一、产品概述

### 1.1 产品定位

**产品名称**：FeishuRAG（飞书智能知识库）

**一句话定义**：飞书原生的轻量AI知识库，让团队像跟同事聊天一样便捷地查询飞书文档。

**核心差异化**：

| 维度 | 传统方案 | 本产品 |
|------|---------|--------|
| 重量级 | CowAgent/LangBot：重 | **轻量：3步配置，5分钟启用** |
| 飞书集成 | AnythingLLM：无 | **原生：飞书窗口直接聊** |
| RAG能力 | OpenClaw：弱/不稳定 | **专业：文档秒读，问答精准** |
| 模型选择 | 固定单一 | **自由：GPT/Claude/DeepSeek随切换** |

**价值主张**：
- 让中小团队无需复杂配置即可拥有AI知识库
- 无需跳出飞书，在熟悉的聊天界面完成知识查询
- 开源可控，支持私有部署

### 1.2 成功指标 (KPIs)

| 指标 | 目标值 | 衡量方式 |
|------|--------|---------|
| 部署时间 | ≤10分钟 | 从拉取代码到首条问答成功 |
| 配置项数量 | ≤5个 | 管理员需要配置的核心项 |
| 问答准确率 | ≥85% | 抽样测试准确率 |
| 响应时间 | P95 ≤5秒 | 日志统计 |
| 用户留存 | 周活跃 ≥60% | 埋点数据 |

---

## 二、目标用户

### 2.1 用户画像

#### 用户群体A：中小企业运营团队（核心用户）

| 属性 | 描述 |
|------|------|
| **规模** | 20-200人 |
| **工具** | 飞书作为主要协作工具 |
| **场景** | 市场活动策划、客服话术、产品文档问答 |
| **痛点** | 文档分散在多个飞书云文档，查找困难 |
| **行为特征** | 习惯在飞书群聊中沟通，期望AI也能在飞书中响应 |
| **付费意愿** | 中等（几百元/月可接受） |

#### 用户群体B：客服/销售团队（高价值用户）

| 属性 | 描述 |
|------|------|
| **规模** | 5-50人 |
| **工具** | 飞书 + 客服系统 |
| **场景** | 实时查询产品知识、常见问题解答 |
| **痛点** | 知识库更新滞后，客户等待时间长 |
| **行为特征** | 高频查询，响应速度要求高 |
| **付费意愿** | 高（有明确ROI） |

#### 用户群体C：技术/研发团队

| 属性 | 描述 |
|------|------|
| **规模** | 5-100人 |
| **工具** | 飞书 + GitHub/GitLab |
| **场景** | 代码文档检索、技术方案问答 |
| **痛点** | 代码和文档分离，跨系统检索困难 |
| **行为特征** | 技术能力强，可接受命令行配置 |
| **付费意愿** | 高 |

### 2.2 用户故事 (User Stories)

```
作为一名：运营专员
我想要：在飞书群里直接问AI关于公司产品的问题
以便：快速获取准确信息，不用去多个文档中搜索

场景示例：
- "我们的退换货政策是什么？"
- "Q2营销活动的预算分配是怎样的？"
- "这个产品的目标用户是谁？"
```

```
作为一名：客服
我想要：实时查询产品FAQ和知识库
以便：快速准确回答客户问题，减少等待时间

场景示例：
- "XX产品的质保期是多久？"
- "如何重置XX设备的密码？"
```

```
作为一名：技术负责人
我想要：让团队成员用自然语言查询技术文档
以便：降低文档查找门槛，提高团队效率

场景示例：
- "这个微服务的API接口在哪里？"
- "如何部署XX应用到K8s？"
```

---

## 三、核心功能规格

### 3.1 功能优先级矩阵

| 优先级 | 功能模块 | 功能点 | 重要性 | 复杂度 | 备注 |
|--------|---------|--------|--------|--------|------|
| P0 | 飞书消息通道 | 消息接收与发送 | 必须有 | 低 | MVP核心 |
| P0 | 飞书文档读取 | 云文档读取 | 必须有 | 中 | 核心知识来源 |
| P0 | RAG问答 | 语义检索+生成 | 必须有 | 高 | 核心价值 |
| P0 | 多模型支持 | LLM调用抽象 | 必须有 | 中 | 差异化功能 |
| P1 | 知识库管理 | 文档管理后台 | 应该有 | 中 | 运营必备 |
| P1 | 对话历史 | 历史记录查询 | 应该有 | 低 | 提升粘性 |
| P2 | 多格式支持 | PDF/Word解析 | 可以有 | 中 | 扩展场景 |
| P2 | 基础对话 | 翻译/总结/续写 | 可以有 | 低 | 增强体验 |

---

### 3.2 P0 功能详细规格

#### 3.2.1 飞书消息通道

**功能描述**：接收用户消息，发送AI回复，实现与飞书的无缝对接。

**实现方式**：基于飞书开放平台Webhook + 轮询混合模式

**详细需求**：

| 编号 | 需求描述 | 验收标准 |
|------|---------|---------|
| MSG-001 | 支持接收飞书私聊消息 | 用户向机器人发送消息，服务器能收到 |
| MSG-002 | 支持接收飞书群@消息 | 群内@机器人，服务器能收到 |
| MSG-003 | 支持发送文本回复 | 回复长度支持到2000字符（飞书限制） |
| MSG-004 | 支持Markdown格式 | 回复支持加粗、链接、列表 |
| MSG-005 | 支持@用户 | AI可以@指定用户 |
| MSG-006 | 消息去重 | 同一message_id不重复处理 |
| MSG-007 | 消息重试机制 | 发送失败时自动重试3次 |

**消息流程**：

```
[飞书客户端] 
    │ 发送消息
    ▼
[飞书服务器] ──Webhook──▶ [我们的服务器]
                              │
                              │ 处理消息
                              ▼
                        [消息处理器]
                              │
                              ▼
                        [RAG引擎] ──▶ [LLM] ──▶ [答案]
                              │
                              ▼
                        [消息发送]
                              │
                              ▼
[飞书客户端] ◀──回复消息── [飞书服务器]
```

**触发词机制**：

| 触发方式 | 示例 | 说明 |
|---------|------|------|
| @机器人 | @AI助手 今天周几 | 群聊中必须@ |
| 私聊 | 直接发送消息 | 无需触发词 |
| 命令前缀 | /ask 周五有什么安排 | 支持命令模式 |

#### 3.2.2 飞书文档读取器

**功能描述**：直接读取飞书云文档和多维表格，作为RAG知识库的原料来源。

**支持类型**：

| 文档类型 | 支持状态 | 说明 |
|---------|---------|------|
| 飞书云文档 | ✅ MVP支持 | text/wiki文档 |
| 飞书多维表格 | ✅ MVP支持 | bitable |
| 飞书文档评论 | ❌ 暂不支持 | 未来版本 |
| PDF附件 | ❌ 暂不支持 | Phase 2 |
| Word/Excel | ❌ 暂不支持 | Phase 2 |

**详细需求**：

| 编号 | 需求描述 | 验收标准 |
|------|---------|---------|
| DOC-001 | 读取云文档全文 | 指定文档token能获取全部文本内容 |
| DOC-002 | 读取多维表格 | 支持表格、多维视图 |
| DOC-003 | 增量同步 | 文档更新后自动同步新内容 |
| DOC-004 | 手动刷新 | 管理员可触发强制刷新 |
| DOC-005 | 权限校验 | 仅读取有权限的文档 |
| DOC-006 | 文档列表 | 显示知识库关联的所有文档 |

**文档同步流程**：

```
[管理员配置文档列表]
        │
        ▼
[文档同步服务]
        │
        ├──▶ [飞书API获取文档] 
        │          │
        │          ▼
        │    [内容解析器] 
        │          │
        │          ▼
        │    [文本切分器] (按段落/章节)
        │          │
        │          ▼
        │    [向量化存储] ──▶ [向量数据库]
        │
        └──▶ [元数据存储] ──▶ [关系数据库]
```

**文档切分策略**：

| 策略 | 参数 | 说明 |
|------|------|------|
| 按段落 | 段落长度 200-500字符 | 默认策略 |
| 按标题层级 | H1/H2/H3 切分点 | 保留文档结构 |
| overlap | 50字符 | 切分边界重叠，保证连贯性 |

#### 3.2.3 基础RAG问答

**功能描述**：接收用户问题，从知识库检索相关内容，生成准确答案。

**技术架构**：采用LangChain框架的RAG流程

**详细需求**：

| 编号 | 需求描述 | 验收标准 |
|------|---------|---------|
| RAG-001 | 语义检索 | 输入问题能返回相关文档片段 |
| RAG-002 | Top-K检索 | 默认返回Top 5相关片段 |
| RAG-003 | 答案生成 | 基于检索结果生成自然语言答案 |
| RAG-004 | 源引用 | 答案中标注引用来源（文档名） |
| RAG-005 | 拒答能力 | 与知识库无关的问题礼貌拒答 |
| RAG-006 | 置信度 | 低置信度问题给出免责声明 |

**RAG流程详解**：

```
[用户问题]
    │
    ▼
[问题向量化] ──▶ embedding模型
    │
    ▼
[向量检索] ──▶ 向量数据库(ChromaDB)
    │         │
    │         ▼
    │    [Top-5 相关文档块]
    │
    ▼
[Prompt构建]
    │
    │ system: "你是一个助手，基于以下参考文档回答用户问题..."
    │ user: "问题: {question}\n\n参考文档:\n{docs}"
    │
    ▼
[LLM生成] ──▶ GPT-4/Claude/DeepSeek
    │
    ▼
[答案后处理]
    │
    ├──▶ 添加源引用
    ├──▶ 格式优化
    └──▶ 拒答检测
    │
    ▼
[返回答案]
```

**Prompt模板**：

```
SYSTEM_PROMPT = """你是一个专业的知识库助手。你的任务是根据提供的参考文档，准确回答用户问题。

规则：
1. 只基于参考文档中的信息回答，不要编造
2. 如果文档中没有相关信息，明确告知用户"抱歉，知识库中没有相关信息"
3. 回答要简洁、准确、易懂
4. 在回答末尾注明参考来源
5. 支持Markdown格式

参考文档：
{context}

问题：{question}
"""

RESPONSE_TEMPLATE = """{answer}

---
📚 参考来源：{source}
"""
```

**拒答策略**：

| 场景 | 示例问题 | 回答策略 |
|------|---------|---------|
| 完全无关 | "今天天气怎么样" | "我是知识库助手，可以帮你查询公司文档哦~" |
| 超出范围 | "帮我写个bug free的代码" | "这个问题超出了知识库范围，建议咨询技术团队" |
| 敏感信息 | "某员工薪资多少" | "抱歉，涉及隐私的信息无法提供" |

#### 3.2.4 多LLM后端支持

**功能描述**：支持主流LLM API，通过统一接口灵活切换。

**支持的模型**：

| 模型 | 支持状态 | API方式 | 上下文长度 | 特点 |
|------|---------|---------|-----------|------|
| GPT-4o | ✅ MVP | OpenAI API | 128K | 效果最佳 |
| GPT-4o-mini | ✅ MVP | OpenAI API | 128K | 性价比高 |
| Claude-3.5-Sonnet | ✅ MVP | Anthropic API | 200K | 长文本强 |
| DeepSeek-V3 | ✅ MVP | DeepSeek API | 64K | 国产性价比 |
| 通义千问2.5 | ✅ MVP | 阿里云API | 32K | 国产合规 |

**详细需求**：

| 编号 | 需求描述 | 验收标准 |
|------|---------|---------|
| LLM-001 | 模型列表 | 支持查看可用模型列表 |
| LLM-002 | 模型切换 | 管理后台一键切换默认模型 |
| LLM- | 按场景选择 | 支持配置不同场景用不同模型 |
| LLM-004 | API密钥配置 | 每个模型独立配置API密钥 |
| LLM-005 | 用量统计 | 记录各模型调用次数/Token消耗 |
| LLM-006 | 熔断机制 | API异常时自动切换备用模型 |

**模型调度策略**：

```python
MODEL_SELECTION_STRATEGY = {
    "default": "gpt-4o-mini",  # 默认使用高性价比模型
    "fallback": "claude-3.5-sonnet",  # 失败时切换
    "long_context": "claude-3.5-sonnet",  # 长文本用Claude
    "code_related": "gpt-4o",  # 代码相关用GPT
    "chinese": "deepseek-v3",  # 中文场景用国产
}
```

---

## 四、功能规格 - P1功能

### 4.1 知识库管理后台

**功能描述**：提供Web管理界面，管理文档、知识库配置。

**页面结构**：

| 页面 | 功能 | 权限 |
|------|------|------|
| 仪表盘 | 统计概览 | 管理员 |
| 文档管理 | 添加/删除/刷新文档 | 管理员 |
| 知识库设置 | 配置向量模型、同步策略 | 管理员 |
| 模型设置 | 配置API密钥、默认模型 | 管理员 |
| 对话日志 | 查看历史对话 | 管理员 |

**详细需求**：

| 编号 | 需求描述 | 验收标准 |
|------|---------|---------|
| ADMIN-001 | 文档列表 | 显示所有已添加的文档及状态 |
| ADMIN-002 | 添加文档 | 输入飞书文档链接，自动解析添加 |
| ADMIN-003 | 删除文档 | 从知识库移除指定文档 |
| ADMIN-004 | 强制刷新 | 手动触发指定文档的重新同步 |
| ADMIN-005 | 同步状态 | 显示上次同步时间、状态 |
| ADMIN-006 | 对话日志 | 查看历史问答记录（可搜索） |

### 4.2 对话历史管理

**功能描述**：保存用户对话记录，支持查询和标记。

**详细需求**：

| 编号 | 需求描述 | 验收标准 |
|------|---------|---------|
| HIST-001 | 自动保存 | 所有问答自动存入数据库 |
| HIST-002 | 会话聚合 | 同一对话线程的记录聚合展示 |
| HIST-003 | 关键词搜索 | 支持搜索历史问答内容 |
| HIST-004 | 标记重点 | 用户可标记重要对话 |
| HIST-005 | 导出功能 | 支持导出对话记录为JSON |

---

## 五、技术架构

### 5.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        飞书客户端                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 私聊消息  │  │ 群@消息  │  │ 群聊消息  │  │  Web后台 │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼────────────┼────────────┼────────────┼────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌───────────────────────────────────────────────────────────────────┐
│                        飞书开放平台                                │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │            Webhook + REST API                                 │  │
│  │  消息事件 │ 发送消息 │ 读取文档 │ 获取用户信息                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/HTTPS
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                      应用服务器 (Docker Container)                 │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                      FastAPI 应用                            │  │
│  │                                                             │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐  │  │
│  │  │ 消息处理   │  │  文档同步  │  │  RAG引擎   │  │ 管理API │  │  │
│  │  │ Module    │  │  Service  │  │  Service  │  │ Service │  │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └─────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │              LangChain RAG Chain                        │ │  │
│  │  │  Embedding → VectorDB → Retriever → Prompt → LLM       │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┼───────────────────────────────┐     │
│  │                    数据存储层                                │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │     │
│  │  │  SQLite     │  │  ChromaDB   │  │  Redis (可选)   │    │     │
│  │  │  结构化数据  │  │  向量数据    │  │  缓存/会话     │    │     │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘    │     │
│  └────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                      外部API服务                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ OpenAI   │  │ Anthropic │  │ DeepSeek │  │  阿里云   │       │
│  │ GPT-4o   │  │ Claude    │  │  DeepSeek │  │  通义千问  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└───────────────────────────────────────────────────────────────────┘
```

### 5.2 技术栈选型

| 层级 | 技术选型 | 选型理由 |
|------|---------|---------|
| **后端框架** | FastAPI | 轻量、异步性能好、自动Swagger文档 |
| **RAG框架** | LangChain + LangChain-community | 生态成熟，组件丰富 |
| **向量数据库** | ChromaDB | 轻量级、API简单、开发效率高 |
| **Embedding** | text-embedding-3-small (OpenAI) | 效果好、成本低 |
| **LLM调用** | LiteLLM | 统一接口、多模型支持 |
| **飞书SDK** | feishu SDK (Python) | 官方维护、稳定 |
| **数据库** | SQLite (MVP) / PostgreSQL (生产) | 开发简单、生产可升级 |
| **前端** | Next.js 14 + React + TailwindCSS | 生态成熟、开发效率高 |
| **部署** | Docker + Docker Compose | 跨平台、一键部署 |
| **配置管理** | YAML配置文件 + 环境变量 | 简单、无外部依赖 |

### 5.3 目录结构

```
feishu-rag/
├── docker-compose.yml          # Docker编排配置
├── Dockerfile                  # 应用镜像构建
├── .env.example                # 环境变量示例
├── README.md                   # 项目说明
│
├── backend/                    # 后端目录
│   ├── main.py                 # FastAPI入口
│   ├── config.py               # 配置管理
│   ├── requirements.txt        # Python依赖
│   │
│   ├── routers/                # API路由
│   │   ├── __init__.py
│   │   ├── message.py          # 飞书消息处理
│   │   ├── document.py         # 文档管理API
│   │   ├── knowledge.py       # 知识库管理API
│   │   └── admin.py           # 管理后台API
│   │
│   ├── services/               # 业务逻辑
│   │   ├── __init__.py
│   │   ├── feishu_service.py   # 飞书API封装
│   │   ├── document_service.py # 文档处理
│   │   ├── rag_service.py     # RAG核心逻辑
│   │   └── llm_service.py      # LLM调用封装
│   │
│   ├── models/                 # 数据模型
│   │   ├── __init__.py
│   │   ├── database.py        # SQLAlchemy模型
│   │   └── schemas.py         # Pydantic模型
│   │
│   ├── core/                   # 核心组件
│   │   ├── __init__.py
│   │   ├── chain.py           # LangChain链配置
│   │   ├── embedding.py       # Embedding配置
│   │   └── prompts.py         # Prompt模板
│   │
│   └── utils/                  # 工具函数
│       ├── __init__.py
│       └── helpers.py
│
├── frontend/                    # 前端目录
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # 首页
│   │   │   ├── dashboard/    # 仪表盘
│   │   │   ├── documents/     # 文档管理
│   │   │   ├── settings/      # 设置页面
│   │   │   └── logs/          # 对话日志
│   │   ├── components/         # 组件
│   │   │   ├── ui/            # 基础UI组件
│   │   │   ├── layout/        # 布局组件
│   │   │   └── features/      # 功能组件
│   │   ├── lib/               # 工具库
│   │   └── styles/            # 样式文件
│   └── public/                # 静态资源
│
└── tests/                      # 测试目录
    ├── unit/                   # 单元测试
    ├── integration/            # 集成测试
    └── conftest.py             # pytest配置
```

### 5.4 环境变量配置

```bash
# .env.example

# ===================
# 飞书配置
# ===================
FEISHU_APP_ID="cli_xxxxxxxxxxxx"
FEISHU_APP_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
FEISHU_BOT_NAME="AI助手"
# 飞书消息加密密钥（开启消息加密时配置）
FEISHU_VERIFICATION_TOKEN=""
FEISHU_ENCRYPT_KEY=""

# ===================
# LLM 配置
# ===================
# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxx"
OPENAI_BASE_URL="https://api.openai.com/v1"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxx"

# DeepSeek
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxx"

# 通义千问
DASHSCOPE_API_KEY="sk-xxxxxxxxxxxx"

# ===================
# 向量数据库
# ===================
CHROMA_PERSIST_DIR="./data/chroma"

# ===================
# 应用配置
# ===================
LOG_LEVEL="INFO"
CORS_ORIGINS="*"
DEFAULT_MODEL="gpt-4o-mini"
EMBEDDING_MODEL="text-embedding-3-small"
```

---

## 六、数据模型

### 6.1 数据库模型 (SQLite/PostgreSQL)

```python
# models/database.py

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Document(Base):
    """知识库文档"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    feishu_doc_token = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    doc_type = Column(String(50), nullable=False)  # doc / bitable
    status = Column(String(20), default="pending")  # pending / syncing / synced / error
    last_sync_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    error_message = Column(Text, nullable=True)
    
    # 关联
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    """文档切分块"""
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)  # 块在文档中的顺序
    content = Column(Text, nullable=False)  # 原始文本
    vector_id = Column(String(255), nullable=True)  # ChromaDB中的ID
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联
    document = relationship("Document", back_populates="chunks")

class Conversation(Base):
    """对话会话"""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), nullable=False, index=True)  # 飞书会话ID
    user_id = Column(String(255), nullable=False)  # 飞书用户ID
    message_id = Column(String(255), nullable=False, index=True)  # 飞书消息ID
    role = Column(String(20), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    model_used = Column(String(50), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    """消息记录"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    message_id = Column(String(255), nullable=False, unique=True, index=True)
    content = Column(Text, nullable=False)
    references = Column(Text, nullable=True)  # JSON格式的引用文档
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation")

class ModelConfig(Base):
    """模型配置"""
    __tablename__ = "model_configs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(50), unique=True, nullable=False)
    provider = Column(String(50), nullable=False)  # openai / anthropic / deepseek / dashscope
    api_key = Column(Text, nullable=False)
    base_url = Column(String(500), nullable=True)
    is_enabled = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UsageStats(Base):
    """用量统计"""
    __tablename__ = "usage_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    model_name = Column(String(50), nullable=False)
    request_count = Column(Integer, default=0)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)  # 预估成本（美元）
```

### 6.2 向量数据库 (ChromaDB)

```python
# ChromaDB Collection Schema

COLLECTION_NAME = "document_chunks"

METADATA_SCHEMA = {
    "document_id": int,           # 文档ID
    "chunk_index": int,           # 块索引
    "feishu_doc_token": str,       # 飞书文档token
    "title": str,                  # 文档标题
}

# 示例查询
collection.query(
    query_texts=["如何申请年假"],
    n_results=5,
    where={"document_id": 1},  # 可选：限定文档
    include=["documents", "metadatas", "distances"]
)
```

---

## 七、API接口规格

### 7.1 飞书消息回调接口

```yaml
# POST /api/v1/feishu/webhook
# 飞书消息事件回调

Request Headers:
  Content-Type: application/json
  X-Lark-Request-Timestamp: "1234567890"
  X-Lark-Request-Nonce: "abc123"
  X-Lark-Signature: "sha256=xxxxxx"  # 如果开启了签名校验

Request Body (Challenge验证):
{
  "challenge": "xxxxx"  # 飞书验证Challenge
}

Response (Challenge响应):
{
  "challenge": "xxxxx"
}

Request Body (消息事件):
{
  "schema": "2.0",
  "header": {
    "event_id": "xxxxx",
    "event_type": "im.message.receive_v1",
    "create_time": "1234567890000",
    "token": "xxxxx",
    "app_id": "cli_xxxxx",
    "tenant_key": "xxxxx"
  },
  "event": {
    "sender": {
      "sender_id": {
        "open_id": "ou_xxxxx",
        "user_id": "xxxxx",
        "union_id": "xxxxx"
      },
      "sender_type": "user",
      "tenant_key": "xxxxx"
    },
    "message": {
      "message_id": "xxxxx",
      "root_id": "",
      "parent_id": "",
      "create_time": "1234567890000",
      "chat_id": "oc_xxxxx",
      "chat_type": "p2p",
      "message_type": "text",
      "content": "{\"text\":\"你好\"}"
    }
  }
}

Response:
{
  "code": 0,
  "msg": "success"
}
```

### 7.2 文档管理API

```yaml
# GET /api/v1/documents
# 获取文档列表

Response:
{
  "code": 0,
  "data": {
    "documents": [
      {
        "id": 1,
        "feishu_doc_token": "BVixxxxx",
        "title": "产品FAQ",
        "doc_type": "doc",
        "status": "synced",
        "chunk_count": 15,
        "last_sync_at": "2026-04-08T10:00:00Z"
      }
    ],
    "total": 10
  }
}

---
# POST /api/v1/documents
# 添加文档

Request:
{
  "doc_token": "BVixxxxx",
  "doc_type": "doc"  # doc / bitable
}

Response:
{
  "code": 0,
  "data": {
    "id": 1,
    "title": "产品FAQ",
    "status": "pending"
  }
}

---
# DELETE /api/v1/documents/{id}
# 删除文档

Response:
{
  "code": 0,
  "msg": "deleted"
}

---
# POST /api/v1/documents/{id}/sync
# 手动同步文档

Response:
{
  "code": 0,
  "data": {
    "status": "syncing",
    "started_at": "2026-04-08T10:00:00Z"
  }
}
```

### 7.3 RAG问答API

```yaml
# POST /api/v1/chat
# 发送问答请求（内部使用，飞书回调触发）

Request:
{
  "question": "我们的退换货政策是什么？",
  "user_id": "ou_xxxxx",
  "chat_id": "oc_xxxxx",
  "session_id": "session_xxxxx",
  "model": "gpt-4o-mini"  # 可选，使用默认模型
}

Response:
{
  "code": 0,
  "data": {
    "answer": "根据我们的退换货政策...\n\n---\n📚 参考来源：产品FAQ",
    "references": [
      {
        "document_id": 1,
        "title": "产品FAQ",
        "chunk_content": "退换货政策：...",
        "relevance_score": 0.95
      }
    ],
    "model_used": "gpt-4o-mini",
    "tokens_used": {
      "prompt": 500,
      "completion": 100,
      "total": 600
    }
  }
}
```

### 7.4 管理API

```yaml
# GET /api/v1/admin/stats
# 获取统计数据

Response:
{
  "code": 0,
  "data": {
    "document_count": 10,
    "chunk_count": 150,
    "conversation_today": 50,
    "conversation_total": 1000,
    "token_usage_today": 50000,
    "token_usage_month": 1000000
  }
}

---
# GET /api/v1/admin/conversations
# 获取对话历史

Query Parameters:
  - page: int (default: 1)
  - page_size: int (default: 20)
  - keyword: string (optional)
  - start_date: string (optional)
  - end_date: string (optional)

Response:
{
  "code": 0,
  "data": {
    "conversations": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}

---
# PUT /api/v1/admin/models/{model_name}
# 更新模型配置

Request:
{
  "is_enabled": true,
  "is_default": true,
  "api_key": "sk-xxxxx",
  "base_url": "https://api.openai.com/v1"
}

Response:
{
  "code": 0,
  "msg": "updated"
}
```

---

## 八、UI/UX规格

### 8.1 设计规范

**设计系统**：基于TailwindCSS + shadcn/ui

**色彩系统**：

```css
:root {
  /* 主色调 */
  --color-primary: #1d4ed8;       /* 蓝色 - 主要按钮、链接 */
  --color-primary-hover: #1e40af;  /* 蓝色hover */
  
  /* 语义色 */
  --color-success: #10b981;        /* 绿色 - 成功状态 */
  --color-warning: #f59e0b;        /* 黄色 - 警告状态 */
  --color-error: #ef4444;          /* 红色 - 错误状态 */
  
  /* 背景色 */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  
  /* 文字色 */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  
  /* 边框色 */
  --color-border: #e5e7eb;
  --color-border-focus: #3b82f6;
}
```

**字体系统**：

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

**间距系统**：基于4px网格

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
```

### 8.2 页面规格

#### 8.2.1 首页/仪表盘

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] FeishuRAG              [设置] [文档管理] [日志]  [用户] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ 文档总数    │ │ 知识块数    │ │ 今日对话    │ │ Token使用   ││
│  │    10      │ │    156     │ │    45      │ │   12,500   ││
│  │  ↑ +2     │ │  ↑ +15    │ │  ↑ +10    │ │  ↑ +2,300 ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 快速上手                                                 │  │
│  │ ┌─────────────────────────────────────────────────────┐  │  │
│  │ │ 1. 在飞书中搜索 "AI助手" 发起私聊                    │  │  │
│  │ │ 2. 发送 /adddoc [文档链接] 添加知识库文档             │  │  │
│  │ │ 3. 开始提问！例如："我们的年假政策是什么？"           │  │  │
│  │ └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 最近对话                                     [查看全部]  │  │
│  │ ┌─────────────────────────────────────────────────────┐  │  │
│  │ │ 💬 如何申请年假？              2026-04-08 10:30    │  │  │
│  │ │ 回答：员工累计工作满1年可享受...                    │  │  │
│  │ ├─────────────────────────────────────────────────────┤  │  │
│  │ │ 💬 产品价格是多少？              2026-04-08 09:15   │  │  │
│  │ │ 回答：根据套餐类型不同...                            │  │  │
│  │ └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 8.2.2 文档管理页面

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] FeishuRAM              [设置] [文档管理] [日志]  [用户] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  文档管理                                          [+ 添加文档] │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🔍 搜索文档...                               状态: [全部▼]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ☑ │ 文档名称              │  类型  │  状态    │  同步时间  │  │
│  ├───┼───────────────────────┼────────┼─────────┼────────────┤  │
│  │ ☑ │ 产品FAQ               │ 云文档 │ ✅已同步 │ 10分钟前   │  │
│  │ ☑ │ 客服话术指南           │ 云文档 │ ✅已同步 │ 30分钟前   │  │
│  │   │ 员工手册               │ 多维表 │ 🔄同步中 │ -         │  │
│  │   │ 销售知识库             │ 云文档 │ ❌失败   │ 1小时前   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  已选择 2 项                      [刷新选中] [删除选中]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 8.2.3 设置页面

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] FeishuRAG              [设置] [文档管理] [日志]  [用户] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  设置                                                               │
│  ┌──────────────────┐                                            │
│  │ ◉ 模型设置        │    模型配置                               │
│  │ ○ 飞书配置        │                                            │
│  │ ○ 知识库设置      │    默认模型: [GPT-4o Mini ▼]               │
│  │                   │                                            │
│  │                   │    ┌────────────────────────────────────┐ │
│  │                   │    │ ✓ OpenAI GPT-4o Mini    [默认]     │ │
│  │                   │    │ ✓ OpenAI GPT-4o         [启用]     │ │
│  │                   │    │ ✓ Anthropic Claude-3.5 [启用]     │ │
│  │                   │    │ ✓ DeepSeek V3          [启用]     │ │
│  │                   │    │ ✓ 通义千问2.5           [启用]     │ │
│  │                   │    └────────────────────────────────────┘ │
│  │                   │                                            │
│  │                   │    [保存配置]                              │
│  └──────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 飞书端交互原型

#### 私聊模式

```
┌─────────────────────────┐
│  AI助手              ⚙️ │
├─────────────────────────┤
│                         │
│          用户           │
│  "如何申请年假？"        │
│                    10:30│
│─────────────────────────│
│                         │
│  AI助手                 │
│  根据《员工手册》第3.2节，│
│  年假申请流程如下：      │
│                         │
│  1. 在飞书工作台打开     │
│     「假期申请」应用     │
│  2. 选择「年假」类型     │
│  3. 选择起始日期        │
│  4. 提交等待审批        │
│                         │
│  📚 参考：员工手册       │
│                    10:30│
│─────────────────────────│
│ [ 请输入问题...    ] 🔸  │
└─────────────────────────┘
```

#### 群聊@模式

```
┌─────────────────────────────────────────┐
│  产品部群聊                    👥 12   │
├─────────────────────────────────────────┤
│                                        │
│  张三                                 │
│  @AI助手 Q2营销预算怎么分配？           │
│                                 10:30  │
│────────────────────────────────────────│
│                                        │
│  AI助手                   │
│  根据《Q2营销方案》，预算分配如下：      │
│                                        │
│  • 线上推广：40%（抖音、小红书）         │
│  • 线下活动：30%（展会、行业峰会）       │
│  • KOL合作：20%                        │
│  • 应急备用：10%                       │
│                                        │
│  📚 参考：Q2营销方案                    │
│                                 10:30  │
│────────────────────────────────────────│
│ [@AI助手 请输入问题...]           🔸  │
└────────────────────────────────────────┘
```

---

## 九、验收标准

### 9.1 功能验收标准

#### P0 功能（必须全部通过）

| ID | 功能 | 验收标准 | 测试方法 |
|----|------|---------|---------|
| AC-001 | 飞书私聊 | 用户向机器人发送消息，5秒内收到AI回复 | 手动测试 |
| AC-002 | 群@消息 | 群内@机器人，AI能正确响应 | 手动测试 |
| AC-003 | 文档添加 | 输入飞书文档链接，文档能成功同步 | 手动测试 |
| AC-004 | 文档同步 | 文档更新后，知识库内容同步更新 | 修改文档后验证 |
| AC-005 | 基础问答 | 提出文档相关问题，能返回正确答案 | 准备测试问题集 |
| AC-006 | 源引用 | 答案中标注参考文档名称 | 验证答案格式 |
| AC-007 | 模型切换 | 切换默认模型后，答案由新模型生成 | 切换后测试 |
| AC-008 | 多模型支持 | 各模型均能正常生成答案 | 各模型逐一测试 |

#### P1 功能（应该通过）

| ID | 功能 | 验收标准 | 测试方法 |
|----|------|---------|---------|
| AC-101 | 文档列表 | 管理后台显示所有已添加文档 | 手动测试 |
| AC-102 | 删除文档 | 删除后文档不再参与检索 | 删除后提问验证 |
| AC-103 | 强制刷新 | 手动刷新后知识库更新 | 修改文档后刷新 |
| AC-104 | 对话历史 | 历史对话能正确显示和搜索 | 搜索关键词验证 |
| AC-201 | 部署文档 | README能指导完成部署 | 按文档部署验证 |

### 9.2 非功能验收标准

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 部署时间 | ≤10分钟 | 从git clone到服务启动 |
| 配置项 | ≤5个 | 核心配置项数量 |
| 冷启动时间 | ≤30秒 | 服务启动到可响应 |
| API响应时间 | P95 ≤3秒 | 除LLM外的API响应 |
| LLM响应时间 | P95 ≤10秒 | 含LLM生成 |
| 并发支持 | ≥10 QPS | 单实例支持 |

### 9.3 测试用例示例

```python
# tests/test_rag_service.py

import pytest
from backend.services.rag_service import RAGService

class TestRAGService:
    
    @pytest.fixture
    def rag_service(self):
        return RAGService()
    
    def test_basic_qa(self, rag_service):
        """测试基础问答功能"""
        question = "公司的年假政策是什么？"
        result = rag_service.answer(question)
        
        assert result["code"] == 0
        assert "answer" in result["data"]
        assert len(result["data"]["answer"]) > 0
        assert "references" in result["data"]
    
    def test_source_citation(self, rag_service):
        """测试源引用"""
        question = "如何申请年假？"
        result = rag_service.answer(question)
        
        answer = result["data"]["answer"]
        assert "📚 参考来源" in answer or "参考来源" in answer
    
    def test_irrelevant_question(self, rag_service):
        """测试无关问题拒答"""
        question = "今天天气怎么样？"
        result = rag_service.answer(question)
        
        # 应该拒答或礼貌引导
        assert result["code"] == 0
        answer = result["data"]["answer"].lower()
        # 应该提示不是知识库问题
        assert any(keyword in answer for keyword in ["抱歉", "无法", "知识库"])
```

---

## 十、实施方案

### 10.1 迭代计划

#### Sprint 1: 基础设施建设 (1周)

**目标**：完成项目骨架搭建

**任务清单**：

| 任务 | 负责人 | 验收标准 |
|------|--------|---------|
| 项目结构搭建 | Agent | 目录结构符合设计 |
| Docker配置 | Agent | docker-compose up 能启动 |
| 数据库模型 | Agent | SQLAlchemy模型创建成功 |
| 飞书应用创建 | 人类 | 获得App ID/Secret |
| 配置文件模板 | Agent | .env.example完整 |

**交付物**：
- 可运行的空壳服务
- 飞书机器人可添加

#### Sprint 2: 飞书消息通道 (1周)

**目标**：完成飞书消息接收和发送

**任务清单**：

| 任务 | 负责人 | 验收标准 |
|------|--------|---------|
| 飞书SDK集成 | Agent | SDK调用正常 |
| Webhook接收 | Agent | 能接收飞书消息 |
| 消息去重 | Agent | 同一message_id不重复处理 |
| 消息发送 | Agent | 能回复飞书消息 |
| 签名校验 | Agent | 开启后安全性验证 |

**交付物**：
- 飞书私聊机器人响应

#### Sprint 3: 文档读取 (1周)

**目标**：完成飞书文档读取和同步

**任务清单**：

| 任务 | 负责人 | 验收标准 |
|------|--------|---------|
| 飞书文档API | Agent | 能获取文档内容 |
| 多维表格API | Agent | 能获取bitable数据 |
| 文档解析 | Agent | 文本提取准确 |
| 文档切分 | Agent | 按策略切分文本 |
| 向量化 | Agent | 文本存入ChromaDB |

**交付物**：
- 文档同步功能
- 管理后台能看到文档

#### Sprint 4: RAG引擎 (1周)

**目标**：完成RAG问答核心

**任务清单**：

| 任务 | 负责人 | 验收标准 |
|------|--------|---------|
| LangChain集成 | Agent | RAG链配置完成 |
| 向量检索 | Agent | 语义检索返回结果 |
| Prompt模板 | Agent | 答案格式符合要求 |
| 源引用 | Agent | 答案标注来源 |
| 拒答逻辑 | Agent | 无关问题正确处理 |

**交付物**：
- 完整RAG问答流程

#### Sprint 5: 多模型支持 (0.5周)

**目标**：完成多LLM后端

**任务清单**：

| 任务 | 负责人 | 验收标准 |
|------|--------|---------|
| LiteLLM集成 | Agent | 统一接口调用 |
| API密钥配置 | Agent | 各模型密钥可配置 |
| 模型切换 | Agent | 管理后台可切换 |
| 用量统计 | Agent | 记录各模型使用 |

**交付物**：
- 多模型支持完成

#### Sprint 6: 管理后台 (0.5周)

**目标**：完成前端管理界面

**任务清单**：

| 任务 | 负责人 | 验收标准 |
|------|--------|---------|
| Next.js搭建 | Agent | 项目运行正常 |
| 仪表盘 | Agent | 统计数据展示 |
| 文档管理 | Agent | 增删改查完成 |
| 模型设置 | Agent | 配置页面完成 |
| 对话日志 | Agent | 历史记录查看 |

**交付物**：
- 完整管理后台

#### Sprint 7: 集成测试 & 优化 (1周)

**目标**：测试验证，修复问题

**任务清单**：

| 任务 | 负责人 | 验收标准 |
|------|--------|---------|
| 端到端测试 | 人类 | 所有验收标准通过 |
| 性能优化 | Agent | 响应时间达标 |
| Bug修复 | Agent | 所有已知Bug修复 |
| 文档完善 | Agent | README完整 |

**交付物**：
- 可发布版本

### 10.2 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 全栈开发 | 1-2人 | 核心开发 |
| 产品 | 0.5人 | 需求确认、验收 |
| 测试 | 0.5人 | 测试、反馈 |

**总工期**：约6周（人类介入时间约2-3小时/天）

---

## 十一、风险与缓解

### 11.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 飞书API不稳定 | 中 | 高 | 添加重试机制，监控API状态 |
| RAG效果不佳 | 高 | 中 | 迭代Prompt优化，切分策略调优 |
| LLM成本超预期 | 中 | 中 | 设置用量上限，会员分级 |
| 向量数据库规模问题 | 低 | 中 | MVP用ChromaDB，生产换Milvus |

### 11.2 产品风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 竞品快速跟进 | 中 | 中 | 快速迭代，建立用户壁垒 |
| 飞书政策变化 | 低 | 高 | 持续关注，保持合规 |
| 用户需求偏离 | 中 | 中 | MVP阶段频繁验证 |

---

## 附录

### A. 参考资料

- [飞书开放平台文档](https://open.feishu.cn/)
- [LangChain Documentation](https://docs.langchain.com/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [LiteLLM Documentation](https://docs.litellm.ai/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

### B. 术语表

| 术语 | 解释 |
|------|------|
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| 向量数据库 | 存储文本向量表示的数据库，支持语义检索 |
| Embedding | 将文本转为向量表示的过程 |
| Chunk | 文档切分后的文本块 |
| ChromaDB | 轻量级向量数据库 |

### C. 飞书API权限清单

| 权限名称 | 权限说明 | 用途 |
|---------|---------|------|
| im:message:send_as_bot | 发送消息 | 回复用户消息 |
| docx:document:readonly | 云文档只读 | 读取文档内容 |
| bitable:app:readonly | 多维表格只读 | 读取多维表格 |
| im:message | 消息读取 | 接收用户消息 |

---

**文档结束**

*本PRD为MVP版本，随着产品迭代持续更新*