# Sprint 7 集成测试文档

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库
**Sprint周期**: Sprint 7 - Admin控制台完善
**测试类型**: API集成测试 + E2E测试
**创建日期**: 2026-04-16

---

## 1. 测试概述

### 1.1 测试范围

Sprint 7 包含以下模块的集成测试：

| 模块 | 页面 | API端点 |
|------|------|---------|
| 7.1 | Admin前端框架 | - |
| 7.2 | Dashboard | `GET /health`, `GET /api/admin/kb/stats` |
| 7.3 | Settings | `GET /api/admin/config`, `PUT /api/admin/config/feishu` |
| 7.4 | Models | `GET/POST/PUT/DELETE /api/admin/models` |
| 7.5 | KnowledgeBase | `GET/POST/DELETE /api/admin/kb/folders`, `POST /api/admin/kb/sync` |
| 7.6 | 响应式适配 | UI布局测试 |

### 1.2 测试类型

1. **API集成测试** (`tests/integration-7-admin.test.ts`)
   - 使用 Vitest + Hono Testing
   - 测试所有 Admin API 端点
   - Mock 外部依赖 (config-store, encryption)

2. **E2E测试** (`tests/e2e/admin-pages.test.ts`)
   - 使用 Playwright
   - 测试前端页面渲染和用户交互
   - 需要前后端服务运行

---

## 2. 测试用例清单

### 2.1 TC-7.1: Health Endpoint

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.1-001 | 获取健康状态 | 返回200, status='ok', 包含timestamp | API |
| TC-7.1-002 | 无可用模型时 | currentModel为null | API |

### 2.2 TC-7.2: Settings API

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.2-001 | 获取配置 | 返回feishu和mcp配置 | API |
| TC-7.2-002 | AppSecret加密 | AppSecret返回'***' | API |
| TC-7.2-003 | 更新AppId | 返回200, 调用setSystemConfig | API |
| TC-7.2-004 | 更新AppSecret | 加密后存储 | API |
| TC-7.2-005 | 空请求 | 返回400 | API |
| TC-7.2-006 | 空字符串Secret | 不调用加密 | API |

### 2.3 TC-7.3: Models CRUD

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.3-001 | 获取所有模型 | 返回模型列表 | API |
| TC-7.3-002 | 无模型时 | 返回空数组 | API |
| TC-7.3-003 | 安全过滤 | 不暴露apiKeyEncrypted | API |
| TC-7.3-004 | 获取单个模型 | 返回模型详情 | API |
| TC-7.3-005 | 模型不存在 | 返回404 | API |
| TC-7.3-006 | 创建模型 | 加密API Key, 返回201 | API |
| TC-7.3-007 | 默认BaseUrl | 根据provider自动设置 | API |
| TC-7.3-008 | 缺少必填字段 | 返回400 | API |
| TC-7.3-009 | 无效Provider | 返回400 | API |
| TC-7.3-010 | 所有有效Provider | openai/anthropic/gemini/ollama | API |
| TC-7.3-011 | 更新模型名称 | 返回200 | API |
| TC-7.3-012 | 更新API Key | 加密新Key | API |
| TC-7.3-013 | 更新isDefault | 正确更新标志 | API |
| TC-7.3-014 | 更新不存在的模型 | 返回404 | API |
| TC-7.3-015 | 删除模型 | 返回200 | API |
| TC-7.3-016 | 删除不存在的模型 | 返回404 | API |

### 2.4 TC-7.4: KnowledgeBase - Folders

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.4-001 | 获取文件夹列表 | 返回folders数组 | API |
| TC-7.4-002 | 缺少name | 返回400 | API |
| TC-7.4-003 | 缺少url | 返回400 | API |
| TC-7.4-004 | 删除不存在的文件夹 | 返回404/500 | API |

### 2.5 TC-7.5: KnowledgeBase - Stats

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.5-001 | 获取KB统计 | 返回totalChunks, totalDocuments等 | API |

### 2.6 TC-7.6: Responsive Layout

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.6-001 | Dashboard响应式 | grid-cols-2 md:grid-cols-4 | 代码检查 |
| TC-7.6-002 | KnowledgeBase响应式 | grid-cols-1 md:grid-cols-3 | 代码检查 |
| TC-7.6-003 | 文件夹操作按钮 | flex-col sm:flex-row | 代码检查 |

### 2.7 TC-7.7: Navigation E2E

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.7-001 | 导航到Dashboard | 显示系统状态 | E2E |
| TC-7.7-002 | 显示状态卡片 | WebSocket/MCP/向量库/LLM | E2E |
| TC-7.7-003 | 显示KB统计 | 文档总数/Chunk数量 | E2E |
| TC-7.7-004 | 显示同步记录 | 最近同步记录区域 | E2E |

### 2.8 TC-7.8: Settings E2E

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.8-001 | 导航到Settings | 显示设置页面 | E2E |
| TC-7.8-002 | 显示飞书配置 | App ID输入框可见 | E2E |
| TC-7.8-003 | 显示MCP配置 | Server URL可见 | E2E |
| TC-7.8-004 | 密码输入框 | App Secret为密码类型 | E2E |

### 2.9 TC-7.9: Models E2E

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.9-001 | 导航到Models | 显示模型管理 | E2E |
| TC-7.9-002 | 显示添加按钮 | 添加模型按钮可见 | E2E |
| TC-7.9-003 | 点击添加按钮 | 显示添加表单 | E2E |
| TC-7.9-004 | 表单字段 | 模型名称输入框可见 | E2E |
| TC-7.9-005 | Provider下拉 | 下拉选择框可见 | E2E |
| TC-7.9-006 | 空表单禁用 | 创建按钮禁用 | E2E |
| TC-7.9-007 | 填写后启用 | 填写必填字段后按钮启用 | E2E |

### 2.10 TC-7.10: KnowledgeBase E2E

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.10-001 | 导航到KnowledgeBase | 显示知识库管理 | E2E |
| TC-7.10-002 | 显示统计卡片 | 文档总数/Chunk数量/全量同步 | E2E |
| TC-7.10-003 | 显示添加区域 | 添加文件夹表单可见 | E2E |
| TC-7.10-004 | 空表单禁用 | 添加按钮禁用 | E2E |
| TC-7.10-005 | 填写后启用 | 填写后按钮启用 | E2E |
| TC-7.10-006 | 空状态 | 无文件夹时显示引导 | E2E |

### 2.11 TC-7.11: Navigation E2E

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.11-001 | 高亮当前项 | 当前导航项蓝色高亮 | E2E |
| TC-7.11-002 | 页面切换 | 各页面正确切换 | E2E |

### 2.12 TC-7.12: Responsive E2E

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.12-001 | 手机端显示 | 375px宽度下正常显示 | E2E |
| TC-7.12-002 | 平板端显示 | 768px宽度下正常显示 | E2E |
| TC-7.12-003 | KB统计堆叠 | 手机端统计卡片垂直堆叠 | E2E |

### 2.13 TC-7.13: API Connectivity E2E

| TC ID | 描述 | 预期结果 | 测试类型 |
|-------|------|----------|---------|
| TC-7.13-001 | Dashboard API | 加载健康检查数据 | E2E |
| TC-7.13-002 | Models API | 加载模型列表 | E2E |
| TC-7.13-003 | KB API | 加载文件夹列表 | E2E |

---

## 3. 测试执行

### 3.1 前置条件

```bash
# 1. 安装依赖
cd ai_feishu
npm install

# 2. 安装 Playwright (如需E2E测试)
npm install -D @playwright/test
npx playwright install chromium
```

### 3.2 运行 API 集成测试

```bash
# 运行所有 Sprint 7 API 测试
npm test -- tests/integration-7-admin.test.ts

# 运行带覆盖率的测试
npm test -- tests/integration-7-admin.test.ts --coverage
```

### 3.3 运行 E2E 测试

```bash
# 1. 启动后端服务 (新终端)
cd ai_feishu
npm run dev

# 2. 启动前端服务 (新终端)
cd admin
npm run dev

# 3. 运行 E2E 测试
npx playwright test tests/e2e/admin-pages.test.ts
```

### 3.4 运行所有测试

```bash
# API 测试
npm test

# E2E 测试 (需要服务运行)
npx playwright test
```

---

## 4. 测试结果解读

### 4.1 API 测试结果

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 4.2 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| KB路由返回500 | 未初始化folderManager | 确保调用initKBRouter |
| API返回401 | ADMIN_API_KEY不匹配 | 检查环境变量 |
| E2E测试超时 | 服务未启动 | 先启动npm run dev |

---

## 5. 测试覆盖率目标

| 模块 | 覆盖率目标 |
|------|-----------|
| admin.ts | 90%+ |
| admin-kb.ts | 85%+ |
| Dashboard页面 | UI测试覆盖 |
| Settings页面 | UI测试覆盖 |
| Models页面 | UI测试覆盖 |
| KnowledgeBase页面 | UI测试覆盖 |

---

## 6. 持续集成

### 6.1 CI 配置 (GitHub Actions)

```yaml
name: Sprint 7 Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- tests/integration-7-admin.test.ts

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run dev &
        sleep 10
      - run: npx playwright test tests/e2e/admin-pages.test.ts
```

---

## 7. 附录

### 7.1 测试环境变量

```bash
# 后端
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
ADMIN_API_KEY=test-api-key
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# 前端
VITE_API_BASE=/api/admin
VITE_ADMIN_API_SECRET=test-api-key
```

### 7.2 API 测试日志示例

```
✓ TC-7.1-001 should return health status (50ms)
✓ TC-7.1-002 should return null model when no models available (23ms)
✓ TC-7.2-001 should return feishu and mcp config (18ms)
...
```

### 7.3 相关文件

| 文件路径 | 描述 |
|----------|------|
| `tests/integration-7-admin.test.ts` | API集成测试 |
| `tests/e2e/admin-pages.test.ts` | E2E页面测试 |
| `src/routers/admin.ts` | Admin API路由 |
| `src/routers/admin-kb.ts` | KB API路由 |
| `admin/src/pages/*.tsx` | 前端页面组件 |

---

**文档版本**: v1.0
**最后更新**: 2026-04-16
