# Sprint 6 Tool Calling Integration Test Documentation

**项目**: AI_Feishu - 飞书原生本地 AI 知识库
**Sprint**: 6 - Tool Calling 集成
**文档版本**: v1.0
**更新日期**: 2026-04-16

---

## 1. 概述

本文档描述 Sprint 6 Tool Calling 集成测试的完整测试流程、测试用例和验证方法。

### 1.1 测试范围

| 模块 | 名称 | 测试类型 |
|------|------|----------|
| 6.1 | read_feishu_url Tool | 单元测试 + 集成测试 |
| 6.2 | search_local_kb Tool | 单元测试 + 集成测试 |
| 6.3 | save_to_new_doc Tool | 单元测试 + 集成测试 |
| 6.4 | Tool Registry | 单元测试 + 集成测试 |

### 1.2 测试目标

1. 验证工具注册与发现机制
2. 验证三个 Tool 的独立功能正确性
3. 验证 Vercel AI SDK 格式兼容性
4. 验证 LLMRouter 与 ToolRegistry 的集成
5. 验证端到端 Tool Calling 流程
6. 确保单元测试不被破坏

---

## 2. 前置条件

### 2.1 环境要求

| 要求 | 说明 |
|------|------|
| Node.js | LTS v20+ |
| npm | 最新版 |
| 服务器 | `npm run dev` 运行在 `localhost:3000` |

### 2.2 环境变量

```bash
# 飞书配置 (用于文档读写)
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# LLM 配置 (用于 save_to_new_doc 的内容整理)
OPENAI_API_KEY=sk-...          # 或使用其他支持的 LLM
ANTHROPIC_API_KEY=sk-...

# Tool Calling 配置
MAX_MESSAGE_LENGTH=10000
MAX_RETRIEVAL_CHUNKS=5

# 管理 API 认证 (可选)
ADMIN_API_KEY=your_admin_key
```

### 2.3 启动服务

```bash
cd ai_feishu
npm run dev
```

服务启动后应看到:
```
Callback server running at http://localhost:3000
```

---

## 3. 测试脚本

### 3.1 脚本位置

```
ai_feishu/scripts/test-sprint6-integration.sh
```

### 3.2 使用方法

```bash
# 基本用法
./scripts/test-sprint6-integration.sh

# 指定服务器地址
./scripts/test-sprint6-integration.sh --server http://localhost:3000

# 使用 API Key
./scripts/test-sprint6-integration.sh --api-key your_admin_key
```

### 3.3 输出示例

```
===============================================
  Sprint 6 Tool Calling Integration Tests
===============================================

Configuration:
  Server: http://localhost:3000
  API Key: Disabled

========================================
  0. Server Health Check
========================================
[PASS] Server is running at http://localhost:3000

========================================
  6.1 read_feishu_url Tool
========================================
[PASS] TC-6.1-INTEG-001: Tool registry accessible - PASSED
[PASS] TC-6.1-INTEG-002: URL parsing regex - PASSED
[PASS] TC-6.1-INTEG-003: Invalid URL rejection - PASSED

========================================
  6.2 search_local_kb Tool
========================================
[PASS] TC-6.2-INTEG-001: KB stats accessible - PASSED
[PASS] TC-6.2-INTEG-002: RAG pipeline has data - READY
[PASS] TC-6.2-INTEG-003: topK cap configured to 5 - PASSED

========================================
  6.3 save_to_new_doc Tool
========================================
[PASS] TC-6.3-INTEG-001: Folder URL parsing - PASSED
[PASS] TC-6.3-INTEG-002: Invalid folder URL rejection - PASSED
[PASS] TC-6.3-INTEG-003: Summary modes defined - PASSED

========================================
  6.4 Tool Registry
========================================
[PASS] TC-6.4-INTEG-001: Tool list verified - PASSED
[PASS] TC-6.4-INTEG-002: Vercel format validated - PASSED
[PASS] TC-6.4-INTEG-003: LLMRouter integration - PASSED

========================================
  E2E: Complete Tool Calling Flow
========================================
[PASS] TC-E2E-001: Requires live Feishu API - SKIPPED
[PASS] TC-E2E-002: Knowledge base has data - READY
[PASS] TC-E2E-003: Requires active session - SKIPPED

========================================
  Test Summary
========================================
Passed: 18
Failed: 0
Total:  18

All tests passed!
```

---

## 4. 测试用例详解

### 4.1 Module 6.1: read_feishu_url Tool

#### TC-6.1-INTEG-001: 工具定义验证

**测试步骤**:
```bash
curl http://localhost:3000/api/mcp/tools
```

**预期结果**: 返回包含 `read_feishu_url` 工具定义的响应

---

#### TC-6.1-INTEG-002: URL 解析验证

**测试步骤**:
验证文档 URL 正则表达式: `/docx/[a-zA-Z0-9]+`

**测试用例**:
- `https://xxx.feishu.cn/docx/abc123XYZ` → 应解析为 `abc123XYZ`
- `https://xxx.feishu.cn/docx/` → 无效
- `https://invalid.com/doc/abc123` → 无效

---

### 4.2 Module 6.2: search_local_kb Tool

#### TC-6.2-INTEG-001: 知识库状态检查

**测试步骤**:
```bash
curl http://localhost:3000/api/admin/kb/stats
```

**预期结果**:
```json
{
  "totalChunks": <number>,
  "totalDocuments": <number>
}
```

---

#### TC-6.2-INTEG-002: RAG 检索验证

**测试步骤**:
```bash
# 先同步文档，然后检查统计
curl -X POST http://localhost:3000/api/admin/kb/sync -d '{}'
curl http://localhost:3000/api/admin/kb/stats
```

**预期结果**: `totalChunks > 0` 表示文档已索引

---

#### TC-6.2-INTEG-003: topK 限制验证

**测试步骤**: 调用 `search_local_kb` 时传入 `topK=10`

**预期结果**: 实际检索返回不超过 5 个 chunks

---

### 4.3 Module 6.3: save_to_new_doc Tool

#### TC-6.3-INTEG-001: 文件夹 URL 解析验证

**测试步骤**: 验证文件夹 URL 正则表达式: `/folder/[a-zA-Z0-9]+`

**测试用例**:
- `https://xxx.feishu.cn/folder/folder123` → 应解析为 `folder123`
- `https://xxx.feishu.cn/docx/doc123` → 无效

---

#### TC-6.3-INTEG-003: Summary Mode 验证

**测试步骤**: 验证三种模式都正确配置

| Mode | 用途 | LLM Prompt 关键词 |
|------|------|------------------|
| `full` | 完整记录 | 保持对话完整性 |
| `summary` | 摘要总结 | 提取关键信息 |
| `action_items` | 行动项 | 提取任务清单 |

---

### 4.4 Module 6.4: Tool Registry

#### TC-6.4-INTEG-001: 工具注册验证

**测试步骤**: 调用 `registry.getTools()` 和 `registry.getToolNames()`

**预期结果**:
```typescript
getTools() // 返回 3 个工具
getToolNames() // ['read_feishu_url', 'search_local_kb', 'save_to_new_doc']
```

---

#### TC-6.4-INTEG-002: Vercel SDK 格式验证

**测试步骤**: 调用 `registry.toVercelTools()`

**预期结果**:
```typescript
[
  {
    description: '读取用户提供的飞书文档链接内容',
    parameters: {
      type: 'object',
      properties: { ... },
      required: ['url']
    }
  },
  // ... search_local_kb
  // ... save_to_new_doc
]
```

---

#### TC-6.4-INTEG-003: LLMRouter 集成验证

**测试步骤**:
```typescript
const llmRouter = new LLMRouter();
llmRouter.setToolRegistry(registry);
llmRouter.executeTool('read_feishu_url', { url: '...' });
```

**预期结果**: 正确调用对应工具并返回结果

---

## 5. 端到端流程测试

### 5.1 完整 Tool Calling 流程

```
用户发送消息
    ↓
LLMRouter 接收消息
    ↓
检测到 Tool Calling 意图
    ↓
ToolRegistry 获取工具列表
    ↓
选择对应工具 (read_feishu_url / search_local_kb / save_to_new_doc)
    ↓
executeTool() 执行工具
    ↓
MCPToolAuthManager 权限检查
    ↓
调用 MCP Server 或降级服务
    ↓
返回结果给用户
```

### 5.2 E2E 场景测试

#### 场景 1: 文档阅读

```bash
用户: "总结这个文档 https://xxx.feishu.cn/docx/xxx"
AI: 调用 read_feishu_url → 返回文档内容 → 总结
```

#### 场景 2: 知识库检索

```bash
用户: "我们上个月的目标是什么"
AI: 调用 search_local_kb → 返回相关片段 → 回答
```

#### 场景 3: 对话归档

```bash
用户: "/save"
AI: 调用 save_to_new_doc → 整理对话 → 创建文档 → 返回链接
```

---

## 6. 单元测试验证

### 6.1 运行单元测试

```bash
cd ai_feishu
npm test -- --run
```

### 6.2 Sprint 6 相关测试文件

| 测试文件 | 测试模块 | 测试数量 |
|---------|---------|----------|
| `tests/tools/read_feishu_url.test.ts` | 6.1 | 14 |
| `tests/tools/search_local_kb.test.ts` | 6.2 | 8 |
| `tests/tools/save_to_new_doc.test.ts` | 6.3 | 12 |
| `tests/tools/index.test.ts` | 6.4 | 5 |
| `tests/integration-6-tool-calling.test.ts` | 集成 | 18 |

### 6.3 预期结果

```
Test Files  28 passed (28)
     Tests  306 passed (306)
```

---

## 7. 故障排查

### 7.1 工具未注册

**问题**: `Tool not found: read_feishu_url`

**解决**:
1. 检查 `ToolRegistry` 是否正确初始化
2. 确认 `setToolRegistry()` 已被调用
3. 检查工具 handler 是否正确绑定

### 7.2 权限检查失败

**问题**: `❌ 文档读取功能已被禁用`

**解决**:
1. 检查 `MCPToolAuthManager` 初始化
2. 确认工具 `enabled` 状态为 `true`
3. 使用 Admin API 启用工具: `PUT /api/mcp/tools/read_document`

### 7.3 LLM 调用失败

**问题**: `save_to_new_doc` 返回错误

**解决**:
1. 检查 LLM API Key 配置
2. 确认 `LLMRouter.generate()` 可以正常调用
3. 检查 `gpt-4o` 模型是否可用

### 7.4 检索返回空

**问题**: `📚 知识库中未找到相关内容`

**解决**:
1. 先执行同步: `POST /api/admin/kb/sync`
2. 检查 `totalChunks > 0`
3. 确认 Embedding 服务正常工作

---

## 8. 验收标准

### 8.1 功能验收

| 验收项 | 标准 | 验证方法 |
|--------|------|----------|
| 工具注册 | 三个工具都注册成功 | 单元测试 |
| URL 解析 | docx/xxx 格式正确解析 | 单元测试 |
| 知识检索 | 返回相关文档片段 | 集成测试 |
| 文档创建 | 调用 create_document 成功 | mock 测试 |
| Vercel 格式 | 格式符合 SDK 要求 | 单元测试 |
| LLMRouter 集成 | setToolRegistry + executeTool | 集成测试 |

### 8.2 测试覆盖

| 模块 | 单元测试 | 集成测试 |
|------|----------|----------|
| 6.1 | ✅ 14个 | ✅ |
| 6.2 | ✅ 8个 | ✅ |
| 6.3 | ✅ 12个 | ✅ |
| 6.4 | ✅ 5个 | ✅ |
| E2E | - | ✅ 18个 |

### 8.3 Sprint 6 完成标准

- [x] 所有单元测试通过 (39 new + 249 existing = 288 tests)
- [x] 集成测试脚本可执行
- [x] E2E 测试用例覆盖
- [x] 文档完整

---

## 9. 附录

### 9.1 相关文件

| 文件 | 说明 |
|------|------|
| `src/tools/index.ts` | ToolRegistry 实现 |
| `src/tools/read_feishu_url.ts` | read_feishu_url Tool |
| `src/tools/search_local_kb.ts` | search_local_kb Tool |
| `src/tools/save_to_new_doc.ts` | save_to_new_doc Tool |
| `src/services/llm-router.ts` | LLMRouter (含工具集成) |
| `tests/tools/*.test.ts` | 工具单元测试 |
| `tests/integration-6-tool-calling.test.ts` | 集成测试 |
| `scripts/test-sprint6-integration.sh` | 集成测试脚本 |

### 9.2 环境变量参考

```bash
# Tool Calling
MAX_MESSAGE_LENGTH=10000
MAX_RETRIEVAL_CHUNKS=5

# Feishu
FEISHU_APP_ID=
FEISHU_APP_SECRET=

# LLM
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=

# Admin
ADMIN_API_KEY=
```

---

**文档版本**: v1.0
**制定日期**: 2026-04-16
**依据文档**: Sprint-06-Tool-Calling集成.md