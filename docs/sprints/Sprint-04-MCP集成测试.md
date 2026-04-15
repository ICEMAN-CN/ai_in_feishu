# Sprint 4 - MCP 集成测试文档 (统一版)

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint**: 4 - MCP 集成  
**文档版本**: v2.0 (统一版)  
**创建日期**: 2026-04-15  
**更新日期**: 2026-04-15

---

## 1. 概述

本文档描述 Sprint 4 所有 4 个 MCP 模块的集成测试流程。

### 1.1 测试范围

| 模块 | 名称 | 测试文件 |
|------|------|----------|
| 4.1 | MCP Client | `scripts/test-sprint4-integration.ts` |
| 4.2 | MCP 工具授权管理 | `scripts/test-sprint4-integration.ts` |
| 4.3 | MCP 降级策略 | `scripts/test-sprint4-integration.ts` |
| 4.4 | Admin MCP 配置 API | `scripts/test-sprint4-integration.ts` |

### 1.2 前置条件

| 条件 | 说明 |
|------|------|
| MCP Server 已部署 | 飞书官方 MCP Server 已启动并可访问 (用于 Module 4.1) |
| 飞书应用已配置 | `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` (用于 Module 4.3) |
| 环境变量已配置 | `.env` 文件中包含必要的环境变量 |
| 依赖已安装 | `npm install` 已执行 |

### 1.3 测试架构

```
scripts/test-sprint4-integration.ts
├── Module 4.1: MCP Client
│   ├── TC-4.1-INTEG-001: 连接测试
│   ├── TC-4.1-INTEG-002: 工具加载
│   ├── TC-4.1-INTEG-003: 工具发现
│   └── TC-4.1-INTEG-004: 健康检查
├── Module 4.2: MCP 工具授权管理
│   ├── TC-4.2-INTEG-001: 默认工具初始化
│   ├── TC-4.2-INTEG-002: isToolEnabled 检查
│   ├── TC-4.2-INTEG-003: getToolAuth
│   ├── TC-4.2-INTEG-004: setToolEnabled
│   └── TC-4.2-INTEG-005: getAllToolAuths
├── Module 4.3: MCP 降级策略
│   ├── TC-4.3-INTEG-001: readDocument 降级
│   ├── TC-4.3-INTEG-002: createDocument 降级
│   └── TC-4.3-INTEG-003: search 降级
└── Module 4.4: Admin MCP 配置 API
    ├── TC-4.4-INTEG-001: GET /mcp/status
    ├── TC-4.4-INTEG-002: GET /mcp/tools
    ├── TC-4.4-INTEG-003: PUT /mcp/tools/:name
    ├── TC-4.4-INTEG-004: PUT /mcp/tools/:name (无效)
    └── TC-4.4-INTEG-005: GET /mcp/health
```

---

## 2. 环境配置

### 2.1 配置 .env 文件

在 `ai_feishu/.env` 中添加或确认以下配置:

```bash
# ==================== MCP 配置 ====================
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_TOKEN=your_mcp_server_token_here
MCP_FALLBACK_ENABLED=true
MCP_TIMEOUT=30000
MCP_RETRY_ATTEMPTS=3

# ==================== 飞书配置 ====================
FEISHU_APP_ID=your_app_id_here
FEISHU_APP_SECRET=your_app_secret_here

# ==================== 管理配置 ====================
ADMIN_API_KEY=your_admin_api_key_here

# ==================== 测试用 (可选) ====================
TEST_FEISHU_DOC_ID=test_document_id
TEST_FEISHU_FOLDER_TOKEN=test_folder_token
```

### 2.2 配置说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `MCP_SERVER_URL` | Module 4.1 | MCP Server 地址 |
| `MCP_SERVER_TOKEN` | 否 | MCP Server 认证 Token |
| `FEISHU_APP_ID` | Module 4.3 | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | Module 4.3 | 飞书应用 App Secret |
| `ADMIN_API_KEY` | 否 | Admin API 认证密钥 |
| `TEST_FEISHU_DOC_ID` | 否 | 测试用飞书文档 ID |
| `TEST_FEISHU_FOLDER_TOKEN` | 否 | 测试用飞书文件夹 Token |

---

## 3. 运行测试

### 3.1 运行统一集成测试

```bash
cd ai_feishu
npx tsx scripts/test-sprint4-integration.ts
```

### 3.2 带环境变量运行

如果不想修改 `.env` 文件，可以直接传环境变量:

```bash
cd ai_feishu
MCP_SERVER_URL=http://your-mcp-server:3001 \
FEISHU_APP_ID=your_app_id \
FEISHU_APP_SECRET=your_secret \
npx tsx scripts/test-sprint4-integration.ts
```

### 3.3 预期输出

```
================================================================================
Sprint 4 MCP 集成测试 - 统一测试所有模块
================================================================================

配置信息:
  MCP_SERVER_URL: http://localhost:3001
  FEISHU_APP_ID: 已设置
  ADMIN_API_KEY: 已设置

测试数据库已创建

================================================================================
Module 4.1: MCP Client
================================================================================

--- TC-4.1-INTEG-001: 连接 MCP Server ---
  连接地址: http://localhost:3001
  [事件] connected 已触发
  连接状态: 已连接
  重连次数: 0
[4.1]     ✅ PASS | 连接 MCP Server | 150ms | 连接成功

--- TC-4.1-INTEG-002: 加载工具列表 ---
  加载工具数量: 3
    - read_document: 读取飞书文档内容
    - create_document: 创建飞书文档
    - search_wiki_or_drive: 在飞书知识库中搜索
[4.1]     ✅ PASS | 加载工具列表 | 80ms | 加载了 3 个工具

--- TC-4.1-INTEG-003: 工具发现 ---
  hasTool('read_document'): ✓
  hasTool('create_document'): ✓
  hasTool('search_wiki_or_drive'): ✓
[4.1]     ✅ PASS | 工具发现 | 5ms | 所有工具已发现

--- TC-4.1-INTEG-004: 健康检查 ---
  healthCheck(): true
[4.1]     ✅ PASS | 健康检查 | 10ms | 健康

================================================================================
Module 4.2: MCP 工具授权管理
================================================================================

--- TC-4.2-INTEG-001: 默认工具初始化 ---
  已初始化工具数量: 6
    - read_document: enabled=true, fallback=true
    - create_document: enabled=true, fallback=true
    - search_wiki_or_drive: enabled=true, fallback=true
    - update_document: enabled=false, fallback=false
    - send_message: enabled=false, fallback=false
    - create_chat: enabled=false, fallback=false
[4.2]     ✅ PASS | 默认工具初始化 | 5ms | 已初始化 6 个工具

--- TC-4.2-INTEG-002: isToolEnabled 检查 ---
  isToolEnabled('read_document'): true (预期: true)
  isToolEnabled('update_document'): false (预期: false)
[4.2]     ✅ PASS | isToolEnabled 检查 | 2ms | 授权状态正确

... (more tests)

================================================================================
测试结果汇总 - Sprint 4 MCP 集成
================================================================================
  4.1: 4/4 通过
  4.2: 5/5 通过
  4.3: 3/3 通过
  4.4: 5/5 通过
--------------------------------------------------------------------------------
总计: 17 | ✅ 通过: 17 | ❌ 失败: 0 | ⏱️ 总耗时: 1234ms
================================================================================

🎉 所有测试通过!
```

---

## 4. 测试用例详解

### 4.1 Module 4.1: MCP Client

#### TC-4.1-INTEG-001: 连接测试

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `MCPClient.connect()` 能成功连接 MCP Server |
| 验证点 | `isConnected()` 返回 `true`，`connected` 事件被触发 |
| 失败可能 | Server 未运行，网络不通，Token 错误 |

#### TC-4.1-INTEG-002: 工具加载

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `loadTools()` 能从 Server 加载可用工具 |
| 验证点 | 工具数量 > 0，工具列表完整 |
| 失败可能 | Server 不支持工具发现，响应格式错误 |

#### TC-4.1-INTEG-003: 工具发现

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `hasTool()`, `getTool()` 方法正确工作 |
| 验证点 | 已知工具返回正确，不存在的工具返回 `undefined` |
| 失败可能 | 工具加载失败 |

#### TC-4.1-INTEG-004: 健康检查

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `healthCheck()` 能正确判断健康状态 |
| 验证点 | 返回 `true` 当且仅当已连接且有工具加载 |
| 失败可能 | 实现逻辑错误 |

### 4.2 Module 4.2: MCP 工具授权管理

#### TC-4.2-INTEG-001: 默认工具初始化

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `MCPToolAuthManager` 初始化时创建默认工具授权 |
| 验证点 | 数据库包含 6 个默认工具的授权记录 |
| 失败可能 | 数据库表不存在，INSERT 失败 |

#### TC-4.2-INTEG-002: isToolEnabled 检查

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `isToolEnabled()` 返回正确的授权状态 |
| 验证点 | `read_document` 返回 `true`，`update_document` 返回 `false` |
| 失败可能 | 数据库查询错误 |

#### TC-4.2-INTEG-003: getToolAuth

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `getToolAuth()` 返回完整的工具授权配置 |
| 验证点 | 返回包含 `toolName`, `enabled`, `fallbackEnabled`, `fallbackMethod` |
| 失败可能 | 数据库查询错误 |

#### TC-4.2-INTEG-004: setToolEnabled

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `setToolEnabled()` 能正确启用/禁用工具 |
| 验证点 | 禁用后再启用，`isToolEnabled()` 返回正确状态 |
| 失败可能 | 数据库 UPDATE 失败 |

#### TC-4.2-INTEG-005: getAllToolAuths

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `getAllToolAuths()` 返回所有工具授权 |
| 验证点 | 返回数组长度 >= 6 |
| 失败可能 | 数据库查询错误 |

### 4.3 Module 4.3: MCP 降级策略

#### TC-4.3-INTEG-001: readDocument 降级

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `MCPFallbackService.readDocument()` 能通过原生 API 读取文档 |
| 验证点 | API 调用流程正确执行 (可能返回错误但流程要对) |
| 失败可能 | API 凭证错误，文档不存在，权限不足 |

#### TC-4.3-INTEG-002: createDocument 降级

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `MCPFallbackService.createDocument()` 能通过原生 API 创建文档 |
| 验证点 | API 调用流程正确执行 |
| 失败可能 | API 凭证错误，文件夹不存在，权限不足 |

#### TC-4.3-INTEG-003: search 降级

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `MCPFallbackService.search()` 能通过原生 API 搜索 |
| 验证点 | API 调用流程正确执行 |
| 失败可能 | API 凭证错误，搜索服务不可用 |

### 4.4 Module 4.4: Admin MCP 配置 API

#### TC-4.4-INTEG-001: GET /mcp/status

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `/mcp/status` 返回连接状态和降级配置 |
| 验证点 | 返回包含 `connected`, `fallbackEnabled`, `serverUrl` |
| 失败可能 | Router 初始化错误，auth manager 未正确注入 |

#### TC-4.4-INTEG-002: GET /mcp/tools

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `/mcp/tools` 返回所有工具授权列表 |
| 验证点 | 返回包含 `tools` 数组，每个工具有 `name`, `enabled`, `availableInMCP` |
| 失败可能 | Router 初始化错误 |

#### TC-4.4-INTEG-003: PUT /mcp/tools/:name

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `/mcp/tools/:name` 能启用/禁用工具 |
| 验证点 | 禁用后再启用，状态正确切换 |
| 失败可能 | 请求体格式错误，工具不存在 |

#### TC-4.4-INTEG-004: PUT /mcp/tools/:name (无效工具名)

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `/mcp/tools/:name` 对无效工具名返回 404 |
| 验证点 | 返回 404 状态码，`success: false` |
| 失败可能 | 未正确处理无效工具名 |

#### TC-4.4-INTEG-005: GET /mcp/health

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `/mcp/health` 返回健康状态 |
| 验证点 | 返回包含 `healthy`, `connected`, `toolsLoaded` |
| 失败可能 | healthCheck 方法未正确实现 |

---

## 5. 故障排查

### 5.1 Module 4.1 连接失败

| 检查项 | 解决方法 |
|--------|----------|
| Server 未启动 | 启动 MCP Server |
| URL 错误 | 检查 `MCP_SERVER_URL` 是否正确 |
| 网络不通 | `curl http://localhost:3001/rpc` 测试连通性 |
| Token 错误 | 检查 `MCP_SERVER_TOKEN` 是否正确 |

### 5.2 Module 4.3 API 调用失败

| 检查项 | 解决方法 |
|--------|----------|
| 凭证错误 | 检查 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` |
| 权限不足 | 确认应用有文档读写权限 |
| 资源不存在 | 检查 `TEST_FEISHU_DOC_ID` 是否存在 |

### 5.3 Module 4.4 API 返回异常

| 检查项 | 解决方法 |
|--------|----------|
| 401 未授权 | 检查 `ADMIN_API_KEY` 是否正确设置 |
| 数据为空 | 确认 `MCPToolAuthManager` 已正确初始化 |
| 状态码异常 | 查看 Router 实现和日志 |

---

## 6. 相关文件

| 文件 | 说明 |
|------|------|
| `src/core/mcp-client.ts` | MCP Client 实现 |
| `src/core/mcp-tool-auth.ts` | MCP 工具授权管理实现 |
| `src/services/mcp-fallback.ts` | MCP 降级服务实现 |
| `src/routers/admin-mcp.ts` | Admin MCP API 实现 |
| `tests/core/mcp-client.test.ts` | Module 4.1 单元测试 |
| `tests/core/mcp-tool-auth.test.ts` | Module 4.2 单元测试 |
| `tests/services/mcp-fallback.test.ts` | Module 4.3 单元测试 |
| `tests/routers/admin-mcp.test.ts` | Module 4.4 单元测试 |
| `scripts/test-sprint4-integration.ts` | **统一集成测试脚本** |

---

## 7. Sprint 4 完成状态

| 模块 | 单元测试 | 集成测试 | 文档 |
|------|----------|----------|------|
| 4.1 MCP Client | ✅ 10 tests | ✅ 4 tests | ✅ |
| 4.2 MCP 工具授权管理 | ✅ 5 tests | ✅ 5 tests | ✅ |
| 4.3 MCP 降级策略 | ✅ 2 tests | ✅ 3 tests | ✅ |
| 4.4 Admin MCP 配置 API | ✅ 10 tests | ✅ 5 tests | ✅ |

---

**文档版本**: v2.0  
**最后更新**: 2026-04-15
