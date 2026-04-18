# AI_Feishu 功能测试用例文档

**项目**: AI_Feishu - 飞书原生本地 AI 知识库
**版本**: v1.0
**更新日期**: 2026-04-18
**测试方式**: 手动测试 + API 测试

---

## 目录

1. [Admin 认证模块](#1-admin-认证模块)
2. [Admin 控制台模块](#2-admin-控制台模块)
3. [飞书消息通道模块](#3-飞书消息通道模块)
4. [AI 模型管理模块](#4-ai-模型管理模块)
5. [知识库管理模块](#5-知识库管理模块)
6. [MCP 集成模块](#6-mcp-集成模块)
7. [Tool Calling 模块](#7-tool-calling-模块)
8. [端到端场景测试](#8-端到端场景测试)

---

## 1. Admin 认证模块

### 1.1 登录功能

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| AUTH-001 | 使用正确 API Key 登录 | 1. 打开 `/admin/login`<br>2. 输入正确的 `ADMIN_API_KEY`<br>3. 点击登录 | 1. 登录成功<br>2. 跳转到 `/admin/dashboard`<br>3. Token 存储到 localStorage | Happy Path |
| AUTH-002 | 使用错误 API Key 登录 | 1. 打开 `/admin/login`<br>2. 输入错误的 API Key<br>3. 点击登录 | 1. 显示错误提示 "Invalid API key"<br>2. 不跳转 | Edge Case |
| AUTH-003 | 登录后刷新页面 | 1. 完成登录<br>2. 刷新页面 | 1. 保持在 Dashboard<br>2. 不跳转到登录页<br>3. 状态保持 | **关键路径** |
| AUTH-004 | Token 过期后刷新 | 1. 登录<br>2. 等待 24 小时或手动修改 localStorage 中的 expiresAt<br>3. 刷新页面 | 1. 自动跳转到登录页<br>2. 清除过期 token | Edge Case |
| AUTH-005 | 未登录直接访问 Dashboard | 1. 不登录直接访问 `/admin/dashboard` | 1. 跳转到 `/admin/login`<br>2. 显示 "Loading..." 后跳转 | Edge Case |
| AUTH-006 | 登出功能 | 1. 登录后点击登出<br>2. 检查 localStorage | 1. 清除 token 和 expiresAt<br>2. 跳转到登录页 | Happy Path |

### 1.2 Token 验证机制

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| AUTH-101 | 服务端验证有效 Token | 1. 登录获取 Token<br>2. 使用 Token 调用 `/api/admin/models` | 1. 请求成功<br>2. 返回 200 | Happy Path |
| AUTH-102 | 使用过期 Token 请求 | 1. 获取已过期的 Token<br>2. 调用任意 API | 1. 返回 401 Unauthorized | Edge Case |
| AUTH-103 | 使用格式错误的 Token | 1. 使用 `invalid-token-format` 调用 API | 1. 返回 401 Unauthorized | Edge Case |
| AUTH-104 | 同时传递 Bearer Token 和 X-Admin-API-Key | 1. 使用 Bearer Token 头调用 API | 1. 优先使用 Bearer Token 验证 | Edge Case |

---

## 2. Admin 控制台模块

### 2.1 Dashboard 页面

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| DASH-001 | Dashboard 加载显示 | 1. 登录后访问 `/admin/dashboard` | 1. 显示 WebSocket 状态<br>2. 显示 MCP 状态<br>3. 显示向量库状态<br>4. 显示当前 LLM 模型 | Happy Path |
| DASH-002 | Dashboard 自动刷新 | 1. 访问 Dashboard<br>2. 等待 30 秒 | 1. 状态自动刷新 | Edge Case |
| DASH-003 | 知识库统计显示 | 1. Dashboard 页面<br>2. 查看统计卡片 | 1. 显示文档总数<br>2. 显示 Chunk 数量<br>3. 显示最后同步时间 | Happy Path |
| DASH-004 | 服务不可用时状态显示 | 1. 停止后端服务<br>2. 访问 Dashboard | 1. 显示断开连接状态<br>2. 显示错误信息 | Edge Case |

### 2.2 Models 页面

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| MODELS-001 | 模型列表加载 | 1. 登录后访问 Models 页面 | 1. 显示所有已配置模型<br>2. 显示默认模型标记<br>3. 显示启用/禁用状态 | Happy Path |
| MODELS-002 | 添加新模型 | 1. 点击 "添加模型"<br>2. 填写: 名称="Test", 提供商=OpenAI, API Key, Base URL, Model ID<br>3. 点击创建 | 1. 模型创建成功<br>2. 列表刷新显示新模型<br>3. 显示成功提示 | Happy Path |
| MODELS-003 | 设置默认模型 | 1. 添加新模型时勾选 "设为默认"<br>2. 创建模型 | 1. 新模型显示 "默认" 标签<br>2. 其他模型默认标记移除 | Happy Path |
| MODELS-004 | 删除模型 | 1. 点击模型卡片的 "删除" 按钮<br>2. 确认 | 1. 模型从列表移除<br>2. 显示成功提示 | Edge Case |
| MODELS-005 | 删除默认模型 | 1. 删除当前默认模型 | 1. 删除成功<br>2. 无默认模型时系统仍正常工作 | Edge Case |
| MODELS-006 | 添加模型 - 缺少必填字段 | 1. 点击添加模型<br>2. 留空必填字段<br>3. 点击创建 | 1. 前端表单验证报错<br>2. 不发送请求 | Edge Case |
| MODELS-007 | API Key 加密存储 | 1. 添加模型后检查数据库 | 1. API Key 以加密形式存储<br>2. 明文 Key 不出现在日志或响应中 | 安全验证 |

### 2.3 KnowledgeBase 页面

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| KB-001 | 文件夹列表加载 | 1. 访问 KnowledgeBase 页面 | 1. 显示已添加的文件夹列表<br>2. 显示每个文件夹的文档数量<br>3. 显示最后同步时间 | Happy Path |
| KB-002 | 添加知识库文件夹 | 1. 输入文件夹名称<br>2. 输入飞书文件夹 URL<br>3. 点击添加 | 1. 文件夹添加成功<br>2. 列表刷新显示新文件夹 | Happy Path |
| KB-003 | 触发全量同步 | 1. 点击 "全量同步" 按钮 | 1. 显示 "同步中..."<br>2. 同步完成后显示成功提示<br>3. 统计数字更新 | Happy Path |
| KB-004 | 触发单个文件夹同步 | 1. 点击文件夹的 "同步" 按钮 | 1. 该文件夹开始同步<br>2. 完成后更新最后同步时间 | Happy Path |
| KB-005 | 删除文件夹 | 1. 点击文件夹的 "删除" 按钮 | 1. 文件夹从列表移除<br>2. 向量库数据保留 | Edge Case |
| KB-006 | 无效文件夹 URL | 1. 输入格式错误的文件夹 URL<br>2. 点击添加 | 1. 显示错误提示<br>2. 不创建文件夹 | Edge Case |

### 2.4 Settings 页面

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| SETTINGS-001 | 飞书配置显示 | 1. 访问 Settings 页面 | 1. 显示当前 App ID<br>2. App Secret 显示为掩码 `***` | Happy Path |
| SETTINGS-002 | 更新飞书配置 | 1. 输入新的 App ID<br>2. 输入新的 App Secret<br>3. 点击保存 | 1. 显示成功提示<br>2. 新配置生效 | Happy Path |
| SETTINGS-003 | 仅更新 App Secret | 1. 只输入 App Secret<br>2. App ID 留空<br>3. 点击保存 | 1. 仅更新 App Secret<br>2. App ID 保持不变 | Edge Case |
| SETTINGS-004 | MCP 配置显示 | 1. 访问 Settings 页面<br>2. 查看 MCP 配置区 | 1. 显示 MCP Server URL<br>2. 显示降级模式状态 | Happy Path |

### 2.5 MCPAuth 页面

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| MCP-001 | MCP 状态显示 | 1. 访问 MCPAuth 页面 | 1. 显示 MCP 连接状态<br>2. 显示服务器 URL | Happy Path |
| MCP-002 | 工具授权列表 | 1. 访问 MCPAuth 页面 | 1. 显示所有工具列表<br>2. 显示每个工具的启用状态<br>3. 显示是否在 MCP 中可用 | Happy Path |
| MCP-003 | 启用/禁用工具 | 1. 切换工具的启用开关<br>2. 刷新页面确认持久化 | 1. 工具状态变更<br>2. 状态持久保存 | Happy Path |
| MCP-004 | 健康检查 | 1. 访问 MCPAuth 页面<br>2. 查看健康状态 | 1. 显示 MCP 健康状态<br>2. 显示已加载工具数量 | Happy Path |

---

## 3. 飞书消息通道模块

### 3.1 WebSocket 连接

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| WS-001 | WebSocket 连接建立 | 1. 启动服务<br>2. 观察日志 | 1. 显示 "WebSocket connected successfully"<br>2. Dashboard 显示 WS connected | Happy Path |
| WS-002 | WebSocket 断开重连 | 1. 模拟网络断开<br>2. 观察日志 | 1. 自动重连<br>2. 显示重连尝试日志 | Edge Case |
| WS-003 | WebSocket 401 错误处理 | 1. 模拟 401 错误 | 1. 刷新凭证后重试 | Edge Case |
| WS-004 | WebSocket 429 限流处理 | 1. 模拟 429 错误 | 1. 指数退避重试 | Edge Case |
| WS-005 | 达到最大重试次数 | 1. 连续重试失败达到上限 | 1. 停止重连<br>2. 触发告警事件 | Edge Case |

### 3.2 消息接收与处理

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| MSG-001 | 接收用户文本消息 | 1. 通过飞书客户端发送文本消息给机器人 | 1. 消息被正确解析<br>2. 触发对话流程 | Happy Path |
| MSG-002 | 消息去重 | 1. 同一消息发送两次 | 1. 第二次消息被拦截<br>2. 不触发重复处理 | Edge Case |
| MSG-003 | 解析根消息 ID 为空 | 1. 发送一条新消息（无 root_id） | 1. 使用 message_id 作为 root_id | Edge Case |
| MSG-004 | 非文本消息处理 | 1. 发送图片、文件等非文本消息 | 1. 消息被忽略<br>2. 不报错 | Edge Case |
| MSG-005 | 机器人消息跳过 | 1. 机器人自己发送的消息 | 1. 被跳过处理 | Edge Case |

### 3.3 消息发送与卡片

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| CARD-001 | 发送会话启动卡片 | 1. 用户首次发送消息<br>2. 未选择模型时 | 1. 显示模型选择卡片<br>2. 卡片包含模型下拉和开始按钮 | Happy Path |
| CARD-002 | 发送流式响应卡片 | 1. 用户选择模型发送消息 | 1. 卡片显示 "正在思考..."<br>2. 卡片内容随响应逐步更新<br>3. 最终响应无光标 `▌` | Happy Path |
| CARD-003 | 流式响应 Markdown 渲染 | 1. AI 返回包含代码块的响应 | 1. Markdown 格式正确渲染 | Edge Case |
| CARD-004 | 更新卡片消息 | 1. 流式输出过程中 | 1. 卡片内容每 200-500ms 更新一次<br>2. 用户看到实时输出效果 | Happy Path |

---

## 4. AI 模型管理模块

### 4.1 LLM 路由

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| LLM-001 | 加载已配置模型 | 1. 启动服务<br>2. 检查日志 | 1. 从数据库加载所有启用模型<br>2. 模型实例创建成功 | Happy Path |
| LLM-002 | 获取默认模型 | 1. 发送消息时未指定模型 | 1. 使用默认模型处理请求 | Edge Case |
| LLM-003 | 模型不存在时处理 | 1. 删除所有模型后发送消息 | 1. 返回 "无可用模型" 卡片 | Edge Case |
| LLM-004 | OpenAI 模型调用 | 1. 配置 OpenAI 模型<br>2. 发送对话请求 | 1. 成功返回流式响应 | Happy Path |
| LLM-005 | Anthropic 模型调用 | 1. 配置 Claude 模型<br>2. 发送对话请求 | 1. 成功返回流式响应 | Happy Path |
| LLM-006 | Gemini 模型调用 | 1. 配置 Gemini 模型<br>2. 发送对话请求 | 1. 成功返回流式响应 | Happy Path |
| LLM-007 | Ollama 本地模型调用 | 1. 配置 Ollama 本地模型<br>2. 发送对话请求 | 1. 成功返回流式响应 | Happy Path |

### 4.2 流式响应

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| STREAM-001 | SSE 流式输出 | 1. 发送对话请求 | 1. 收到 SSE 流式响应<br>2. 内容逐步返回 | Happy Path |
| STREAM-002 | 流式响应完整性 | 1. 等待响应完成 | 1. 最终内容与流式累加一致<br>2. 无截断或丢失 | Edge Case |
| STREAM-003 | 长响应处理 | 1. 发送需要长回答的问题 | 1. 响应完整返回<br>2. 无超时或截断 | Edge Case |

---

## 5. 知识库管理模块

### 5.1 文件夹管理

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| KB-FOLDER-001 | 添加文件夹 | 1. API: `POST /api/admin/kb/folders`<br>2. body: `{"name": "测试", "url": "https://xxx.feishu.cn/folder/xxx"}` | 1. 创建成功<br>2. 返回 folder ID | Happy Path |
| KB-FOLDER-002 | 解析文件夹 Token | 1. 添加文件夹时 | 1. 从 URL 正确提取 folder_token | Edge Case |
| KB-FOLDER-003 | 无效 URL 格式 | 1. 添加非飞书文件夹 URL | 1. 返回错误 "Invalid folder URL" | Edge Case |
| KB-FOLDER-004 | 获取所有文件夹 | 1. API: `GET /api/admin/kb/folders` | 1. 返回文件夹数组 | Happy Path |
| KB-FOLDER-005 | 删除文件夹 | 1. API: `DELETE /api/admin/kb/folders/:id` | 1. 文件夹从列表移除<br>2. 向量库数据可能保留 | Edge Case |

### 5.2 文档同步

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| SYNC-001 | 同步单个文件夹 | 1. API: `POST /api/admin/kb/sync`<br>2. body: `{"folderId": "xxx"}` | 1. 同步成功<br>2. 文档入库<br>3. 向量生成 | Happy Path |
| SYNC-002 | 全量同步 | 1. API: `POST /api/admin/kb/sync` (无 folderId) | 1. 所有启用的文件夹同步 | Happy Path |
| SYNC-003 | 同步统计更新 | 1. 同步完成后 | 1. lastSyncAt 更新时间<br>2. lastSyncDocCount 更新数量 | Edge Case |
| SYNC-004 | 增量同步 | 1. 修改飞书文档后再次同步 | 1. 新文档添加<br>2. 修改文档更新<br>3. 删除文档不处理（保留） | Edge Case |

### 5.3 文档检索

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| RETRIEVE-001 | 语义检索 | 1. 调用 `search_local_kb` tool | 1. 返回相关文档片段<br>2. 结果按相关性排序 | Happy Path |
| RETRIEVE-002 | 空结果处理 | 1. 检索不存在的 query | 1. 返回友好提示 "知识库中未找到相关内容" | Edge Case |
| RETRIEVE-003 | topK 限制 | 1. 检索时指定 topK=10 | 1. 最多返回 5 个结果（系统限制） | Edge Case |

---

## 6. MCP 集成模块

### 6.1 MCP Client

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| MCP-CLIENT-001 | 连接 MCP Server | 1. 启动服务<br>2. 检查日志 | 1. 显示 "[MCP] Connected successfully"<br>2. isConnected() = true | Happy Path |
| MCP-CLIENT-002 | 断开连接 | 1. 调用 disconnect() | 1. isConnected() = false<br>2. 触发 disconnected 事件 | Edge Case |
| MCP-CLIENT-003 | 健康检查 | 1. API: `GET /api/admin/mcp/health` | 1. 返回健康状态<br>2. 返回已加载工具数量 | Happy Path |

### 6.2 工具授权

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| AUTH-TOOL-001 | 检查已授权工具 | 1. 调用 `isToolEnabled('read_document')` | 1. 返回 true | Happy Path |
| AUTH-TOOL-002 | 检查未授权工具 | 1. 调用 `isToolEnabled('update_document')` | 1. 返回 false | Edge Case |
| AUTH-TOOL-003 | 调用已授权工具 | 1. 调用 `callToolIfAllowed('read_document', ...)` | 1. 工具正常调用 | Happy Path |
| AUTH-TOOL-004 | 调用未授权工具 | 1. 调用 `callToolIfAllowed('update_document', ...)` | 1. 抛出 Error "Tool not allowed" | Edge Case |

### 6.3 降级策略

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| FALLBACK-001 | MCP 失败后降级 | 1. MCP 断开连接<br>2. 调用工具 | 1. 自动调用降级方法<br>2. 使用原生 API 执行 | Edge Case |
| FALLBACK-002 | read_document 降级 | 1. 调用飞书原生 API 读取文档 | 1. 正确返回文档内容 | Happy Path |
| FALLBACK-003 | create_document 降级 | 1. 调用飞书原生 API 创建文档 | 1. 文档创建成功<br>2. 返回 documentId 和 URL | Happy Path |
| FALLBACK-004 | 降级禁用时 MCP 失败 | 1. 工具 fallbackEnabled=false<br>2. MCP 断开连接<br>3. 调用工具 | 1. 抛出 Error | Edge Case |

---

## 7. Tool Calling 模块

### 7.1 read_feishu_url Tool

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| TOOL-READ-001 | 读取有效文档 | 1. 用户发送: "总结这个文档 https://xxx.feishu.cn/docx/xxx" | 1. AI 调用 read_feishu_url<br>2. 返回文档内容<br>3. AI 总结内容 | Happy Path |
| TOOL-READ-002 | 解析文档 ID | 1. 从 URL 提取 document_id | 1. 正确提取 `/docx/` 后的 ID | Edge Case |
| TOOL-READ-003 | 无效文档 URL | 1. 用户发送无效 URL | 1. AI 返回错误提示 | Edge Case |
| TOOL-READ-004 | 工具被禁用 | 1. 禁用 read_document 工具<br>2. 用户发送文档链接 | 1. AI 返回 "文档读取功能已被禁用" | Edge Case |
| TOOL-READ-005 | 超长文档截断 | 1. 读取超过 10000 字符的文档 | 1. 内容被截断<br>2. 显示 "[文档内容已截断]" | Edge Case |

### 7.2 search_local_kb Tool

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| TOOL-SEARCH-001 | 知识库检索 | 1. 用户询问涉及知识库内容的问题 | 1. AI 调用 search_local_kb<br>2. 返回检索结果<br>3. AI 基于结果回答 | Happy Path |
| TOOL-SEARCH-002 | 空结果 | 1. 检索不存在相关内容 | 1. AI 返回 "知识库中未找到相关内容" | Edge Case |
| TOOL-SEARCH-003 | 工具被禁用 | 1. 禁用 search_wiki_or_drive 工具<br>2. 用户询问知识库问题 | 1. AI 返回 "知识库检索功能已被禁用" | Edge Case |

### 7.3 save_to_new_doc Tool

| 用例ID | 用例描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| TOOL-SAVE-001 | 保存对话到新文档 | 1. 用户说: "保存这个对话" | 1. AI 调用 save_to_new_doc<br>2. 创建新飞书文档<br>3. 返回文档链接 | Happy Path |
| TOOL-SAVE-002 | 完整归档模式 | 1. 用户说: "完整归档这个对话" | 1. 对话完整保存<br>2. Markdown 格式 | Happy Path |
| TOOL-SAVE-003 | 摘要归档模式 | 1. 用户说: "总结归档这个对话" | 1. 生成摘要保存<br>2. 提取关键信息 | Happy Path |
| TOOL-SAVE-004 | 行动项归档模式 | 1. 用户说: "提取行动项归档" | 1. 提取任务清单<br>2. 保存为结构化文档 | Happy Path |
| TOOL-SAVE-005 | 指定保存文件夹 | 1. 用户指定保存到的文件夹 | 1. 文档创建到指定位置 | Edge Case |
| TOOL-SAVE-006 | 工具被禁用 | 1. 禁用 create_document 工具<br>2. 用户请求保存 | 1. AI 返回 "文档创建功能已被禁用" | Edge Case |

---

## 8. 端到端场景测试

### 8.1 完整对话流程

| 用例ID | 场景描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| E2E-001 | 用户登录 -> 配置模型 -> 对话 | 1. 打开 Admin UI 登录<br>2. 添加 OpenAI 模型<br>3. 设置为默认<br>4. 打开飞书发送 "你好" | 1. 登录成功<br>2. 模型添加成功<br>3. AI 返回流式响应 | **关键路径** |
| E2E-002 | 多模型切换对话 | 1. 添加多个模型<br>2. 在飞书选择非默认模型对话 | 1. 使用选定的模型处理 | **关键路径** |
| E2E-003 | 对话刷新保持 | 1. 登录 Admin<br>2. 在飞书开始对话<br>3. 刷新 Admin 页面 | 1. Admin 保持登录状态 | Edge Case |

### 8.2 知识库完整流程

| 用例ID | 场景描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| E2E-101 | 配置知识库 -> 同步 -> 检索 | 1. Admin 添加飞书文件夹<br>2. 触发同步<br>3. 在飞书问知识库相关问题 | 1. 文件夹添加成功<br>2. 文档同步成功<br>3. AI 检索并回答 | **关键路径** |
| E2E-102 | 读取飞书文档内容 | 1. 用户发送飞书文档链接<br>2. 要求总结 | 1. AI 读取文档<br>2. 返回总结 | **关键路径** |

### 8.3 对话归档流程

| 用例ID | 场景描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| E2E-201 | 对话 -> 归档 -> 查看文档 | 1. 在飞书进行对话<br>2. 说 "保存对话"<br>3. 打开生成的文档链接 | 1. 文档创建成功<br>2. 内容完整<br>3. 链接可访问 | **关键路径** |

### 8.4 异常恢复流程

| 用例ID | 场景描述 | 测试步骤 | 预期结果 | 类型 |
|--------|----------|----------|----------|------|
| E2E-301 | MCP 断开 -> 降级处理 | 1. MCP Server 断开<br>2. 用户发送文档链接 | 1. 使用原生 API 处理<br>2. 用户无感知 | Edge Case |
| E2E-302 | LLM API 限流 | 1. 模拟 LLM 返回限流错误 | 1. 优雅处理<br>2. 返回友好错误 | Edge Case |
| E2E-303 | 网络断开重连 | 1. 模拟网络断开<br>2. 恢复后发送消息 | 1. WebSocket 自动重连<br>2. 消息正常处理 | Edge Case |

---

## 附录

### A. 测试环境准备

```bash
# 1. 启动开发服务器
npm run dev

# 2. 访问 Admin UI
http://localhost:3000/admin/

# 3. API 基础地址
http://localhost:3000/api/admin
```

### B. 测试账号

```bash
# Admin API Key (from .env or start-dev.sh)
ADMIN_API_KEY=your-admin-api-key

# Feishu Bot Token (飞书开放平台获取)
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
```

### C. curl 测试模板

```bash
# 登录获取 Token
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-admin-api-key"}'

# 使用 Token 调用 API
TOKEN="your-session-token"
curl http://localhost:3000/api/admin/models \
  -H "Authorization: Bearer $TOKEN"

# 获取健康状态
curl http://localhost:3000/api/admin/health

# 获取 KB 统计
curl http://localhost:3000/api/admin/kb/stats \
  -H "Authorization: Bearer $TOKEN"
```

### D. 飞书测试消息模板

```json
// 文本消息
{
  "header": {
    "event_type": "im.message.receive_v1",
    "token": "xxx"
  },
  "event": {
    "sender": {"sender_id": {"open_id": "ou_xxx"}, "sender_type": "user"},
    "message": {
      "message_id": "om_xxx",
      "root_id": "",
      "parent_id": "",
      "chat_id": "oc_xxx",
      "chat_type": "p2p",
      "message_type": "text",
      "content": "{\"text\":\"你好\"}"
    }
  }
}
```

---

**文档版本**: v1.0
**制定日期**: 2026-04-18
**依据文档**: Sprint 1-8 所有模块文档
