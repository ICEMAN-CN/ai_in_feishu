# Sprint 4 - MCP 集成测试文档

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint**: 4 - MCP 集成  
**文档版本**: v1.0  
**创建日期**: 2026-04-15

---

## 1. 概述

本文档描述 Sprint 4 Module 4.1 (MCP Client) 的集成测试流程。

### 1.1 测试目的

验证 MCP Client 与飞书官方 MCP Server 的集成功能是否正常工作。

### 1.2 前置条件

| 条件 | 说明 |
|------|------|
| MCP Server 已部署 | 飞书官方 MCP Server 已启动并可访问 |
| 环境变量已配置 | `.env` 文件中包含 `MCP_SERVER_URL` 和 `MCP_SERVER_TOKEN` |
| 依赖已安装 | `npm install` 已执行 |

### 1.3 测试文件

| 文件 | 说明 |
|------|------|
| `scripts/test-mcp-integration.ts` | 集成测试脚本 |
| `tests/core/mcp-client.test.ts` | 单元测试 (已通过) |

---

## 2. 环境配置

### 2.1 配置 .env 文件

在 `ai_feishu/.env` 中添加或确认以下配置:

```bash
# ==================== MCP配置 ====================
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_TOKEN=your_mcp_server_token_here
MCP_FALLBACK_ENABLED=true
MCP_TIMEOUT=30000
MCP_RETRY_ATTEMPTS=3
```

### 2.2 配置说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `MCP_SERVER_URL` | 是 | MCP Server 地址，如 `http://localhost:3001` |
| `MCP_SERVER_TOKEN` | 否 | MCP Server 认证 Token (如有) |
| `MCP_FALLBACK_ENABLED` | 否 | 是否启用降级策略，默认 `true` |
| `MCP_TIMEOUT` | 否 | 请求超时时间(ms)，默认 `30000` |
| `MCP_RETRY_ATTEMPTS` | 否 | 连接重试次数，默认 `3` |

---

## 3. 运行测试

### 3.1 运行集成测试

```bash
cd ai_feishu
npx tsx scripts/test-mcp-integration.ts
```

### 3.2 带环境变量运行

如果不想修改 `.env` 文件，可以直接传环境变量:

```bash
cd ai_feishu
MCP_SERVER_URL=http://your-mcp-server:3001 MCP_SERVER_TOKEN=your_token npx tsx scripts/test-mcp-integration.ts
```

### 3.3 预期输出

```
======================================================================
MCP 集成测试
======================================================================

配置信息:
  MCP_SERVER_URL: http://localhost:3001
  MCP_SERVER_TOKEN: 已设置
  MCP_TIMEOUT: 30000ms
  MCP_RETRY_ATTEMPTS: 3

--- TC-4.1-INTEG-001: 连接 MCP Server ---
  连接地址: http://localhost:3001
  [事件] connected 事件已触发
  连接状态: 已连接
✅ PASS | 连接 MCP Server | 150ms | 连接成功

--- TC-4.1-INTEG-002: 加载工具列表 ---
  加载工具数量: 3
  工具列表:
    - read_document: 读取飞书文档内容
    - create_document: 创建飞书文档
    - search_wiki_or_drive: 在飞书知识库中搜索
✅ PASS | 加载工具列表 | 80ms | 加载了 3 个工具

--- TC-4.1-INTEG-003: 工具发现 ---
  hasTool('read_document'): ✓
  hasTool('create_document'): ✓
  hasTool('search_wiki_or_drive'): ✓
  getTool('read_document'): ✓
✅ PASS | 工具发现 | 5ms | 所有检查通过

--- TC-4.1-INTEG-004: 工具调用 ---
  尝试调用工具: read_document
  工具调用返回预期错误: xxx
✅ PASS | 工具调用 | 200ms | Server 返回: xxx

--- TC-4.1-INTEG-005: 降级机制 ---
  success: false
  降级逻辑已触发 (符合预期)
✅ PASS | 降级机制 | 50ms | 降级返回预期结果

--- TC-4.1-INTEG-006: 断开连接 ---
  isConnected() after disconnect: false
✅ PASS | 断开连接 | 10ms | 断开成功

--- TC-4.1-INTEG-007: 重连机制 ---
  Server 可用，重连机制未触发
✅ PASS | 重连机制 | 1200ms | Server 可用

======================================================================
测试结果汇总
======================================================================
总计: 7 | ✅ 通过: 7 | ❌ 失败: 0 | ⏱️ 总耗时: 1695ms
======================================================================

🎉 所有测试通过!
```

---

## 4. 测试用例详解

### 4.1 TC-4.1-INTEG-001: 连接 MCP Server

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `MCPClient.connect()` 能成功连接 MCP Server |
| 验证点 | `isConnected()` 返回 `true`，`connected` 事件被触发 |
| 失败可能 | Server 未运行，网络不通，Token 错误 |

### 4.2 TC-4.1-INTEG-002: 加载工具列表

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `loadTools()` 能从 Server 加载可用工具 |
| 验证点 | 工具数量 > 0，工具列表完整 |
| 失败可能 | Server 不支持工具发现，响应格式错误 |

### 4.3 TC-4.1-INTEG-003: 工具发现

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `hasTool()`, `getTool()` 方法正确工作 |
| 验证点 | 已知工具返回正确，不存在的工具返回 `undefined` |
| 失败可能 | 工具加载失败 |

### 4.4 TC-4.1-INTEG-004: 工具调用

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `callTool()` 能调用 Server 上的工具 |
| 验证点 | 调用流程正确执行 (结果可能失败但流程要对) |
| 失败可能 | 工具不存在，参数错误，Server 不支持 |

### 4.5 TC-4.1-INTEG-005: 降级机制

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `callWithFallback()` 降级逻辑 |
| 验证点 | MCP 失败时返回 `success: false` 和错误信息 |
| 失败可能 | 降级逻辑未触发 |

### 4.6 TC-4.1-INTEG-006: 断开连接

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证 `disconnect()` 能正确断开连接 |
| 验证点 | `isConnected()` 返回 `false` |
| 失败可能 | 断开逻辑有问题 |

### 4.7 TC-4.1-INTEG-007: 重连机制

| 项目 | 说明 |
|------|------|
| 测试内容 | 验证连接失败时重试逻辑 |
| 验证点 | `reconnecting` 事件被触发 |
| 失败可能 | Server 可用时不触发 (正常) |

---

## 5. 故障排查

### 5.1 连接失败

| 检查项 | 解决方法 |
|--------|----------|
| Server 未启动 | 启动 MCP Server |
| URL 错误 | 检查 `MCP_SERVER_URL` 是否正确 |
| 网络不通 | `curl http://localhost:3001/rpc` 测试连通性 |
| Token 错误 | 检查 `MCP_SERVER_TOKEN` 是否正确 |

### 5.2 工具加载失败

| 检查项 | 解决方法 |
|--------|----------|
| Server 不支持 | 确认 Server 版本支持工具发现 |
| 响应格式错误 | 查看 Server 日志 |

### 5.3 工具调用失败

| 检查项 | 解决方法 |
|--------|----------|
| 工具不存在 | 检查工具名称是否正确 |
| 参数错误 | 查看工具的 `inputSchema` |
| 权限不足 | 检查 Token 权限 |

---

## 6. 后续步骤

测试通过后，可以继续以下模块:

| 模块 | 任务 | 文档 |
|------|------|------|
| 4.2 | MCP 工具授权管理 | `docs/sprints/Sprint-04-MCP集成.md#模块-4.2` |
| 4.3 | MCP 降级策略 | `docs/sprints/Sprint-04-MCP集成.md#模块-4.3` |
| 4.4 | Admin MCP 配置 API | `docs/sprints/Sprint-04-MCP集成.md#模块-4.4` |

---

## 7. 相关文件

| 文件 | 说明 |
|------|------|
| `src/core/mcp-client.ts` | MCP Client 实现 |
| `tests/core/mcp-client.test.ts` | 单元测试 (mock) |
| `scripts/test-mcp-integration.ts` | 集成测试脚本 |
| `.env.example` | 环境变量示例 |

---

**文档版本**: v1.0  
**最后更新**: 2026-04-15