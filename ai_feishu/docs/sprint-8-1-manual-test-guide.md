# Sprint 8.1 手动测试指南

## 测试环境准备

### 1. 环境变量配置

在 `ai_feishu` 目录创建 `.env` 文件：

```bash
# 飞书配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 加密密钥 (64位十六进制)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# 数据库路径
DATA_DIR=./data
SQLITE_PATH=./data/config.db

# 向量数据库路径
LANCE_PATH=./data/knowledge.lance

# 消息限制
MAX_MESSAGE_LENGTH=10000
THREAD_MESSAGE_LIMIT=50

# LLM API 配置 (至少配置一个)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# 向量嵌入模型 (可选)
EMBEDDING_MODEL=text-embedding-3-small
```

### 2. 安装依赖

```bash
cd ai_feishu
npm install
```

### 3. 启动服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

---

## 测试用例

### TC-E2E-001: 基础对话

**测试目标:** 验证用户与机器人的基本对话功能

**前置条件:**
- 至少配置一个 LLM 模型
- 飞书机器人已上线

**测试步骤:**

1. 打开飞书 → 进入与机器人的私聊
2. 发送消息: `你好，请介绍一下你自己`

**预期响应:**
1. 收到交互卡片，显示模型名称 + "正在思考..."
2. 卡片内容逐步更新（流式响应）
3. 响应内容显示光标 `▌`
4. 流式结束后，光标移除，显示完整响应

**验证日志:**
```
[Server] Message received: msg_xxx from open_xxx in chat_xxx
[SessionManager] Creating new session for thread: thread_xxx
[LLMRouter] Loading model: GPT-4o (openai)
[StreamingHandler] Starting stream...
[StreamingHandler] Updating card with cursor: xxx▌
[StreamingHandler] Finalizing card, no cursor
```

**通过标准:**
- [ ] 卡片正确显示模型名称
- [ ] 流式响应正常展示
- [ ] 光标在响应过程中显示，结束后消失
- [ ] 对话内容符合模型能力

---

### TC-E2E-002: 文档问答

**测试目标:** 验证 AI 阅读飞书文档并回答问题的能力

**前置条件:**
- 已在飞书知识库中添加测试文档
- 文档内容包含可回答的问题

**测试步骤:**

1. 发送消息: `@机器人 帮我总结一下这份文档的核心要点`
2. 或发送文档链接: `请阅读这个文档 https://xxx.feishu.cn/docx/xxx 并回答问题`

**预期响应:**
1. 收到卡片显示 "正在阅读文档..."
2. AI 成功读取文档内容
3. 基于文档内容生成回答
4. 回答准确关联文档内容

**验证日志:**
```
[ToolHandler] Executing tool: read_feishu_url
[ToolHandler] Tool result: success, content_length: 2048
[LLMRouter] Processing with context from document
[StreamingHandler] Updating card: 阅读完成，正在整理回答...
```

**通过标准:**
- [ ] 文档读取成功
- [ ] 回答内容与文档相关
- [ ] 未出现文档内容幻觉

---

### TC-E2E-003: 知识库检索

**测试目标:** 验证 RAG 知识库检索功能

**前置条件:**
- 知识库已导入至少 5 个文档
- 文档已完成向量化处理

**测试步骤:**

1. 发送消息: `查找关于项目架构的相关资料`
2. 或发送: `有哪些关于部署的文档？`

**预期响应:**
1. 收到卡片显示 "正在检索知识库..."
2. AI 基于向量相似度匹配相关文档
3. 返回相关文档列表或直接回答
4. 回答中引用了检索到的内容

**验证日志:**
```
[VectorStore] Searching knowledge base for: 项目架构
[VectorStore] Found 3 relevant chunks, similarity: [0.89, 0.82, 0.75]
[RAGHandler] Retrieved context from 3 documents
[LLMRouter] Processing with retrieved context
```

**数据库验证:**
```bash
sqlite3 ./data/config.db "SELECT id, doc_name, chunk_count, created_at FROM documents;"
```

**通过标准:**
- [ ] 检索到相关文档
- [ ] 返回结果与查询意图匹配
- [ ] 回答包含检索来源

---

### TC-E2E-004: 工具调用链

**测试目标:** 验证多工具顺序调用的能力

**前置条件:**
- 所有核心工具已注册
- 模型支持 function calling

**测试步骤:**

1. 发送消息: `帮我创建一个新文档，内容是项目周报`

2. 或发送消息链请求:
   ```
   1) 先搜索知识库中关于周报的内容
   2) 基于搜索结果，创建一份新文档
   3) 把文档链接发给我
   ```

**预期响应:**
1. 收到卡片显示 "正在执行操作..."
2. 按顺序执行多个工具调用
3. 每步操作显示进度
4. 最终返回文档链接或确认信息

**验证日志:**
```
[ToolHandler] Executing tool: search_local_kb
[ToolHandler] Tool result: found 2 documents
[ToolHandler] Executing tool: save_to_new_doc
[ToolHandler] Tool result: doc created, id: doc_xxx
[ToolHandler] Executing tool: read_feishu_url
[ToolHandler] All tools executed successfully
[StreamingHandler] Finalizing response
```

**通过标准:**
- [ ] 工具按正确顺序执行
- [ ] 每个工具输出作为下一个工具输入
- [ ] 最终结果正确返回
- [ ] 无工具执行失败

---

### TC-E2E-005: 模型切换

**测试目标:** 验证不同模型之间的切换功能

**前置条件:**
- 已配置至少 2 个不同模型
- 已设置默认模型

**测试步骤:**

1. **测试默认模型:**
   发送消息: `你现在用的什么模型？`

2. **切换到其他模型:**
   发送消息: `@机器人 切换到 Claude`

3. **验证切换:**
   发送消息: `你现在用什么模型？`

4. **恢复默认:**
   发送消息: `@机器人 恢复默认模型`

**预期响应:**

1. 默认模型回答
2. 切换成功后提示: "已切换到 Claude"
3. Claude 模型回答
4. 恢复默认成功提示

**验证日志:**
```
[ModelRouter] Switching model from GPT-4o to Claude-3-Sonnet
[ModelRouter] Model switch successful
[LLMRouter] Loading model: Claude-3-Sonnet (anthropic)
[ModelRouter] Restoring default model: GPT-4o
```

**数据库验证:**
```bash
sqlite3 ./data/config.db "SELECT id, name, is_default FROM models;"
```

**通过标准:**
- [ ] 成功识别模型切换指令
- [ ] 模型正确加载新配置
- [ ] 切换后的对话使用新模型
- [ ] 恢复默认功能正常

---

## Feishu 集成测试

### 前置条件

1. 已在飞书开放平台创建应用
2. 已配置事件订阅 (im.message.receive_v1)
3. 已配置回调地址为 `https://your-domain.com/feishu`
4. 应用已发布并加入测试群/私聊

### 测试流程

1. **启动服务器** - `npm run dev`
2. **打开飞书** - 进入与机器人的私聊
3. **发送测试消息** - 开始执行 TC-E2E-001 至 TC-E2E-005

### 调试日志

启动服务器时观察以下日志:

```
🚀 Starting server on port 3000...
📡 POST http://localhost:3000/feishu
💚 GET  http://localhost:3000/health
🔧 GET  http://localhost:3000/api/admin/models
✅ Server running at http://localhost:3000

[Server] Message received: msg_xxx from open_xxx in chat_xxx
[SessionManager] Creating new session for thread: thread_xxx
[LLMRouter] Loading model: GPT-4o (openai)
[StreamingHandler] Starting stream...
[StreamingHandler] Updating card with cursor: xxx▌
[ToolHandler] Executing tool: search_local_kb
[ToolHandler] Tool result: found 3 documents
[StreamingHandler] Finalizing card
[SessionManager] Updated message count for session: session_xxx
```

---

## 数据库验证

### 查看 Session

```bash
sqlite3 ./data/config.db "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10;"
```

### 查看 Models

```bash
sqlite3 ./data/config.db "SELECT id, name, provider, is_default FROM models;"
```

### 查看 Documents

```bash
sqlite3 ./data/config.db "SELECT id, doc_name, chunk_count, status FROM documents;"
```

### 查看 Knowledge Base (LanceDB)

```bash
# 查看向量数据
ls -la ./data/knowledge.lance/
```

---

## 常见问题

### Q: 消息发送后没有响应

**检查:**
1. 服务器是否运行 - `curl http://localhost:3000/health`
2. 飞书回调是否配置正确
3. 日志是否有 `[Server] Message received`
4. 数据库是否有 session 记录

### Q: 知识库检索无结果

**检查:**
1. 文档是否已导入 - `SELECT * FROM documents;`
2. 文档状态是否为 `indexed`
3. 向量数据库是否正常 - `ls ./data/knowledge.lance/`
4. 检索词是否与文档内容相关

### Q: 工具调用失败

**检查:**
1. 工具是否已注册 - 查看日志中的 tool list
2. API Key 是否配置正确
3. 飞书应用权限是否足够
4. 网络连接是否正常

### Q: 模型切换不生效

**检查:**
1. 目标模型是否已配置 - `SELECT * FROM models WHERE name='xxx';`
2. API Key 是否有效
3. 日志是否显示 `[ModelRouter] Model switch successful`

### Q: 向量化失败

**检查:**
1. Embedding 模型是否配置
2. 文档内容是否为空
3. 向量数据库目录权限

---

## 测试完成清单

| 测试编号 | 测试内容 | 状态 |
|---------|---------|------|
| TC-E2E-001 | 基础对话 | ☐ |
| TC-E2E-002 | 文档问答 | ☐ |
| TC-E2E-003 | 知识库检索 | ☐ |
| TC-E2E-004 | 工具调用链 | ☐ |
| TC-E2E-005 | 模型切换 | ☐ |

**环境验证:**
- [ ] `.env` 文件已创建
- [ ] 所有依赖已安装
- [ ] 服务器启动成功
- [ ] 飞书回调配置正确

**功能验证:**
- [ ] 流式响应正常
- [ ] 消息截断正常
- [ ] 错误处理正常
- [ ] Session 管理正常

---

## 测试备注

### 测试数据准备

测试前建议准备以下数据:

1. **飞书文档** - 包含中英文内容的测试文档
2. **知识库语料** - 至少 5 个可检索的文档
3. **多模型配置** - OpenAI + Anthropic 各一个

### 测试账号要求

- 飞书测试企业管理员账号
- LLM API 账号（有额度）

### 推荐工具

- [Insomnia](https://insomnia.rest/) - API 测试
- [Postman](https://www.postman.com/) - API 测试
- [sqlitebrowser](https://sqlitebrowser.org/) - SQLite 可视化
- 飞书开放平台调试台 - 消息调试