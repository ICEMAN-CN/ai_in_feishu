(注：本选型基于竞品 AnythingLLM / LobeChat 的前沿架构，并针对“重度飞书长连接”和“桌面端演进”做了深度优化。)

#### 1. 架构整体定位

- **形态**：B/S 架构本地化运行，第一阶段为 Local Web App，第二阶段打包为跨平台桌面端（Mac/Windows）。
    
- **特点**：极低内存占用、0 云端数据库依赖、基于 WebSocket 的持久化飞书连接、全面采用 Node.js/TS 生态以便前后端同构。
    

#### 2. 竞品技术栈映射与借鉴

- 借鉴 **LobeChat**：前端 UI 组件库（shadcn/ui）、Vercel AI SDK 多模型流式路由。
    
- 借鉴 **AnythingLLM**：本地无头向量库架构（LanceDB）、轻量级文档解析流程。
    
- 借鉴 **CowAgent**：后端持久化进程处理 IM 平台 WebSocket 心跳与并发。
    
- 抛弃 FastGPT / OpenClaw 等：因为引入了 Postgres、Redis 或过于庞大的 Agent 框架，不符合轻量化定位。
    

#### 3. 详细技术栈清单 (供开发参考)

**【后端 & 核心大核引擎 (Core Engine)】**  
考虑到需要维持与飞书的 WSS 长连接，不能用 Serverless（如 Next.js API Routes），必须有独立的 Node.js 进程守护。

- **运行环境**：Node.js (LTS v20+)
    
- **核心框架**：Hono.js (比 Express 更轻量、类型安全、极速，兼容性极强)
    
- **飞书官方 SDK**：@larksuiteoapi/node-sdk (用于建立长连接、接收消息卡片回调、调用飞书 Doc API)
    
- **大模型路由调度**：Vercel AI SDK (Core) (极简 API，支持多厂商对接，自带 Tool Calling 标准化支持，完美替代 Python 的 LiteLLM)
    
- **文档处理 & Chunking**：LangChain.js 的 TextSplitters (仅使用其文本切分工具，**不使用**其沉重的链式和 Agent 逻辑)
    

**【本地数据存储层 (Local Data Layer)】**  
坚决不用独立数据库进程，全面采用“嵌入式文件库”。

- **向量数据库 (Vector DB)**：LanceDB (Node.js 驱动)
    
    - 选型理由：无头部署，数据存为本地 .lance 文件夹；Rust 底层，查询飞快；原生支持多模态；AnythingLLM 在用的成熟方案。
        
- **本地轻量配置/关系库**：SQLite3 (或 better-sqlite3)
    
    - 选型理由：用于存储用户的多模型 API Key、不同飞书 Thread 绑定的模型配置、卡帕西知识图谱的 JSON 边关系（Edges）。
        

**【前端 & Web 中控台 (Web Admin UI)】**  
前端不承载聊天，只做炫酷的数据看板和配置中心。

- **前端框架**：React 18 + Vite (推荐纯 CSR 单页应用，方便未来打包进桌面端，不需要 Next.js 的 SSR 负担)
    
- **样式与组件**：Tailwind CSS + shadcn/ui (LobeChat 同款组件库，极具现代感和极客范)
    
- **知识图谱渲染 (Phase 2)**：react-force-graph (轻量化 2D/3D 图谱渲染库)
    
- **状态管理**：Zustand (极简，抛弃 Redux)
    

**【多端演进与打包打包 (Deployment & Desktop Wrapper)】**

- **桌面端框架**：Tauri 2.0
    
    - 选型理由：基于 Rust，打包后的体积通常小于 20MB（Electron 动辄 150MB+），内存占用极小。支持将我们的 Node.js Hono 后端作为 "Sidecar (伴生进程)" 一起打包，一键安装，开箱即用。
        

#### 4. 关键数据流向约束 (开发必读)

1. **消息监听**：Node.js 后端通过 @larksuiteoapi/node-sdk 的 WebSocket 模块，常驻监听飞书事件。
    
2. **Tool Calling 规范**：使用 Vercel AI SDK 的 tool 方法定义飞书操作（如 read_feishu_url, create_feishu_doc），让大模型根据对话自主决定何时触发，避免硬编码的 if-else。
    
3. **数据不出堡垒**：前端 UI 通过调用本地 Node.js 暴露的 localhost:PORT/api 接口拉取配置和知识库统计。绝对禁止前端直接向飞书或云端模型发起网络请求。