# Sprint 3.3-3.5 手动测试指南

## 测试环境准备

### 1. 环境变量配置

在 `ai_feishu` 目录创建 `.env` 文件：

```bash
# 飞书配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 加密密钥 (64位十六进制)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# 数据库路径 (可选)
DATA_DIR=./data
SQLITE_PATH=./data/config.db

# 消息限制 (可选)
MAX_MESSAGE_LENGTH=10000
THREAD_MESSAGE_LIMIT=20
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

### TC-1: Admin API - 健康检查

```bash
curl http://localhost:3000/health
```

**预期响应:**
```json
{"status":"ok","timestamp":"2026-04-14T22:00:00.000Z"}
```

---

### TC-2: Admin API - 列出所有模型

```bash
curl http://localhost:3000/api/admin/models
```

**预期响应:**
```json
{"models":[...]}
```

---

### TC-3: Admin API - 创建模型

```bash
curl -X POST http://localhost:3000/api/admin/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4o",
    "provider": "openai",
    "apiKey": "sk-your-openai-key",
    "modelId": "gpt-4o",
    "isDefault": true,
    "temperature": 0.7,
    "maxTokens": 4096
  }'
```

**预期响应:**
```json
{"id":"uuid-xxx","success":true}
```

**验证:**
```bash
curl http://localhost:3000/api/admin/models | jq '.models[] | select(.name=="GPT-4o")'
```

---

### TC-4: Admin API - 更新模型

```bash
curl -X PUT http://localhost:3000/api/admin/models/<model-id> \
  -H "Content-Type: application/json" \
  -d '{"name": "GPT-4o-Updated", "temperature": 0.8}'
```

**预期响应:**
```json
{"success":true}
```

---

### TC-5: Admin API - 删除模型

```bash
curl -X DELETE http://localhost:3000/api/admin/models/<model-id>
```

**预期响应:**
```json
{"success":true}
```

---

### TC-6: ContextManager - 消息截断

发送超长消息到飞书机器人：

```
发送一段超过 10000 字符的文本
```

**预期:**
- 消息被截断至 10000 字符
- 末尾添加 `[消息已截断，超出最大长度限制]`
- LLM 正常处理截断后的消息

---

### TC-7: StreamingHandler - 流式响应

发送普通消息到飞书机器人：

```
你好，请介绍一下你自己
```

**预期:**
1. 收到初始卡片，显示模型名称 + "正在思考..."
2. 卡片内容逐步更新（300ms 间隔）
3. 响应内容显示光标 `▌`
4. 流式结束后，光标移除，显示完整响应

**验证日志:**
```
[Server] Message received: xxx from open_xxx in chat_xxx
[StreamingHandler] Starting stream...
[StreamingHandler] Updating card with cursor: xxxx▌
[StreamingHandler] Finalizing card, no cursor
```

---

### TC-8: ContextManager - Token 估算

**测试方法:** 发送混合语言消息

```
Hello 你好 world 世界
```

**验证:** 响应正常，无错误

---

### TC-9: 错误处理 - 无模型配置

在数据库中删除所有模型，然后发送消息：

```bash
curl -X DELETE http://localhost:3000/api/admin/models/<model-id>
# 删除所有模型

# 发送消息到飞书
```

**预期:**
- 发送欢迎卡片，让用户选择模型
- 不抛出未捕获异常

---

### TC-10: 错误处理 - LLM API 失败

配置错误的 API Key，然后发送消息：

```bash
curl -X PUT http://localhost:3000/api/admin/models/<model-id> \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "invalid-key"}'

# 发送消息到飞书
```

**预期:**
- 发送错误卡片 (红色标题 "❌ 错误")
- 显示错误信息
- 不中断服务器

---

## Feishu 集成测试

### 前置条件

1. 已在飞书开放平台创建应用
2. 已配置事件订阅 (im.message.receive_v1)
3. 已配置回调地址为 `https://your-domain.com/feishu`

### 测试流程

1. **配置模型** (通过 Admin API 或直接操作数据库)
2. **打开飞书** → 进入与机器人的私聊
3. **发送消息** → `你好`
4. **观察:**
   - 是否收到流式响应卡片
   - 是否逐步更新内容
   - 是否正确显示模型名称

### 调试日志

启动服务器时观察以下日志:

```
🚀 Starting server on port 3000...
📡 POST http://localhost:3000/feishu
💚 GET  http://localhost:3000/health
🔧 GET  http://localhost:3000/api/admin/models
✅ Server running at http://localhost:3000

[Server] Message received: msg_xxx from open_xxx in chat_xxx
[Server] Creating session for thread: thread_xxx
[StreamingHandler] Starting stream...
[LLMRouter] Loading model: GPT-4o (openai)
[StreamingHandler] Updating card: xxx▌
...
[StreamingHandler] Finalizing card
[SessionManager] Updated message count for session: session_xxx
```

---

## 数据库验证

### 查看 Session

```bash
sqlite3 ./data/config.db "SELECT * FROM sessions;"
```

### 查看 Models

```bash
sqlite3 ./data/config.db "SELECT id, name, provider, is_default FROM models;"
```

---

## 常见问题

### Q: 消息发送后没有响应

**检查:**
1. 服务器是否运行
2. 飞书回调是否配置正确
3. 日志是否有 `[Server] Message received`
4. 数据库是否有 session 记录

### Q: 流式卡片不更新

**检查:**
1. 是否配置了有效的 LLM API Key
2. API Key 是否有额度
3. 网络是否正常

### Q: 消息被截断

**检查:**
- 消息长度是否超过 10000 字符
- 截断标记: `[消息已截断`

---

## 测试完成清单

| 测试编号 | 测试内容 | 状态 |
|---------|---------|------|
| TC-1 | 健康检查 | ☐ |
| TC-2 | 列出模型 | ☐ |
| TC-3 | 创建模型 | ☐ |
| TC-4 | 更新模型 | ☐ |
| TC-5 | 删除模型 | ☐ |
| TC-6 | 消息截断 | ☐ |
| TC-7 | 流式响应 | ☐ |
| TC-8 | 混合语言 | ☐ |
| TC-9 | 无模型处理 | ☐ |
| TC-10 | 错误处理 | ☐ |

---

## 关于 Admin UI

**当前状态:** **暂无 Admin UI**

目前管理模型的方式：
1. **Admin API** - 通过 HTTP 请求管理 (推荐)
2. **直接操作 SQLite** - 使用 sqlite3 命令行
3. **未来计划** - Sprint 7 将开发 React Admin Console

### 推荐工具

- [Insomnia](https://insomnia.rest/) - API 测试
- [Postman](https://www.postman.com/) - API 测试
- [sqlitebrowser](https://sqlitebrowser.org/) - SQLite 可视化
