# Sprint 8: 集成测试与优化

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint周期**: 1周  
**前置依赖**: Sprint 1-7 所有模块  
**Sprint目标**: 全流程测试，修复问题，优化性能，发布可交付版本

---

## 1. 模块划分

### 模块 8.1: 全流程串联测试
### 模块 8.2: 性能测试
### 模块 8.3: 安全测试
### 模块 8.4: 异常处理测试
### 模块 8.5: Bug修复
### 模块 8.6: 文档完善

---

## 2. 模块详细规格

### 模块 8.1: 全流程串联测试

**目标**: 验证从用户发送消息到AI完整回复的全流程

#### 2.1.1 测试场景矩阵

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| TC-E2E-001 | 基础对话 | 用户发送"你好" | AI正常回复 | 手动测试 |
| TC-E2E-002 | 文档问答 | 用户发送文档链接+问题 | AI读取并回答 | 手动测试 |
| TC-E2E-003 | 知识库检索 | 用户询问知识库内容 | 返回相关文档片段 | 手动测试 |
| TC-E2E-004 | 工具调用链 | 需要多步操作的请求 | 工具顺序执行 | 手动测试 |
| TC-E2E-005 | 模型切换 | 切换到不同模型 | 使用新模型响应 | 手动测试 |

#### 2.1.2 端到端测试脚本

```typescript
// tests/e2e/conversation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('全流程对话测试', () => {
  test.beforeEach(async ({ page }) => {
    // 模拟登录态
    await page.goto('/');
  });

  test('基础对话流程', async ({ page }) => {
    // 1. 发送消息
    await page.fill('[data-testid="message-input"]', '你好');
    await page.click('[data-testid="send-button"]');

    // 2. 等待卡片出现
    await expect(page.locator('[data-testid="message-card"]')).toBeVisible();

    // 3. 等待流式响应完成
    await page.waitForSelector('[data-testid="response-complete"]', { timeout: 30000 });

    // 4. 验证回复内容
    const response = await page.locator('[data-testid="ai-response"]').textContent();
    expect(response?.length).toBeGreaterThan(0);
  });

  test('文档问答流程', async ({ page }) => {
    // 1. 发送带文档链接的消息
    await page.fill('[data-testid="message-input"]', 
      '总结这个文档 https://example.feishu.cn/docx/xxx');
    await page.click('[data-testid="send-button"]');

    // 2. 等待工具调用
    await page.waitForSelector('[data-testid="tool-call-indicator"]', { timeout: 10000 });

    // 3. 等待响应完成
    await page.waitForSelector('[data-testid="response-complete"]', { timeout: 60000 });

    // 4. 验证包含文档内容
    const response = await page.locator('[data-testid="ai-response"]').textContent();
    expect(response).toContain('文档');
  });

  test('知识库检索流程', async ({ page }) => {
    // 1. 发送知识库相关问题
    await page.fill('[data-testid="message-input"]', 'Q3目标是什么？');
    await page.click('[data-testid="send-button"]');

    // 2. 等待响应
    await page.waitForSelector('[data-testid="response-complete"]', { timeout: 30000 });

    // 3. 验证返回相关片段
    const response = await page.locator('[data-testid="ai-response"]').textContent();
    expect(response?.length).toBeGreaterThan(10);
  });
});
```

#### 2.1.3 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 基础对话 | 用户能正常与AI对话 | 手动测试 |
| 文档问答 | 能读取并总结飞书文档 | 手动测试 |
| 知识库检索 | 能检索并返回相关内容 | 手动测试 |
| 端到端日志 | 全流程日志可追溯 | 日志审查 |

---

### 模块 8.2: 性能测试

**目标**: 验证系统在并发和压力下的表现

#### 2.2.1 性能测试场景

| 测试编号 | 测试场景 | 指标要求 | 测试方法 |
|---------|---------|---------|---------|
| PT-001 | 并发10用户 | 无异常，全部正确响应 | 自动化测试 |
| PT-002 | 消息响应时间P50 | ≤2s | 日志统计 |
| PT-003 | 流式首字时间 | ≤500ms | 日志统计 |
| PT-004 | WebSocket并发100 | 连接稳定 | 压力测试 |
| PT-005 | 内存泄漏检测 | 运行24小时无泄漏 | 长时间测试 |

#### 2.2.2 性能测试脚本

```typescript
// tests/performance/load.spec.ts
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // 2分钟内升到10用户
    { duration: '5m', target: 10 },   // 保持10用户5分钟
    { duration: '2m', target: 0 },    // 2分钟内降到0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],  // 95%请求在2秒内
    'errors': ['rate<0.05'],               // 错误率小于5%
  },
};

export default function () {
  // 1. 发送消息
  const res = http.post(
    'http://localhost:3000/api/chat',
    JSON.stringify({
      message: `测试消息 ${__VU}-${__ITER}`,
      threadId: 'test-thread',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // 2. 检查响应
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has response': (r) => r.body && r.body.length > 0,
  }) || errorRate.add(1);

  // 3. 等待下次迭代
  sleep(1);
}
```

#### 2.2.3 性能监控

```bash
# 启动监控
prometheus --config.file=prometheus.yml

# 查看指标
# - http_req_duration: 请求延迟
# - websocket_connections: WebSocket连接数
# - active_conversations: 活跃对话数
# - mcp_tool_calls_total: MCP工具调用次数
```

#### 2.2.4 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 并发10用户 | 全部正确响应，无报错 | 自动化测试 |
| P50响应时间 | ≤2秒 | 日志统计 |
| P95响应时间 | ≤5秒 | 日志统计 |
| 流式首字 | ≤500ms | 日志统计 |
| 内存稳定 | 运行24小时无泄漏 | 监控面板 |

---

### 模块 8.3: 安全测试

**目标**: 验证系统安全措施有效性

#### 2.3.1 安全测试场景

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| SEC-001 | API Key加密 | 查看数据库 | Key为密文 | 数据库查看 |
| SEC-002 | 签名校验开启 | 非法签名消息 | 返回401，reject | 安全测试 |
| SEC-003 | 签名校验关闭 | 任意消息 | 正常处理 | 配置测试 |
| SEC-004 | SQL注入 | 用户名"' OR '1'='1" | 过滤或报错 | 自动化测试 |
| SEC-005 | XSS攻击 | 消息包含\<script> | 转义处理 | 自动化测试 |
| SEC-006 | 越权访问 | 用户A访问用户B数据 | 拒绝访问 | 权限测试 |
| SEC-007 | 权限开关 | 关闭写权限后AI尝试创建 | 返回权限不足 | 边界测试 |

#### 2.3.2 安全测试脚本

```typescript
// tests/security/api-key.spec.ts
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

test.describe('API Key安全测试', () => {
  test('数据库中API Key应为密文', async () => {
    // 1. 读取数据库文件
    const dbPath = './data/ai_feishu.db';
    const db = await openDatabase(dbPath);
    
    // 2. 查询模型配置
    const models = await db.all('SELECT * FROM models');
    
    // 3. 验证所有API Key都是加密的
    for (const model of models) {
      if (model.apiKey) {
        // 应该不是明文
        expect(model.apiKey).not.toMatch(/^sk-[a-zA-Z0-9]{20,}$/);
        // 应该是密文（以加密前缀或乱码形式存在）
        const isEncrypted = 
          model.apiKey.startsWith('enc:') || 
          model.apiKey.length > 100; // AES-256-GCM加密后会更长
        expect(isEncrypted).toBe(true);
      }
    }
  });

  test('配置更新后API Key重新加密', async () => {
    // 1. 获取当前API Key
    const before = await getModel('test-model');
    
    // 2. 更新配置
    await updateModel('test-model', { apiKey: 'sk-newkey123' });
    
    // 3. 重新读取
    const after = await getModel('test-model');
    
    // 4. 验证新Key也是加密的
    expect(after.apiKey).not.toBe('sk-newkey123');
    expect(after.apiKey).not.toEqual(before.apiKey);
  });
});

test.describe('签名校验安全测试', () => {
  test('非法签名应被拒绝', async ({ request }) => {
    const res = await request.post('http://localhost:3000/api/feishu/webhook', {
      headers: {
        'x-feishu-signature': 'invalid-signature',
      },
      data: {
        message: 'test',
      },
    });
    
    expect(res.status()).toBe(401);
  });

  test('正常签名应被接受', async ({ request }) => {
    const timestamp = Date.now().toString();
    const signString = `${timestamp}test`;
    const signature = crypto.createHmac('sha256', FEISHU_APP_SECRET)
      .update(signString)
      .digest('hex');
    
    const res = await request.post('http://localhost:3000/api/feishu/webhook', {
      headers: {
        'x-feishu-timestamp': timestamp,
        'x-feishu-signature': signature,
      },
      data: {
        message: 'test',
      },
    });
    
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(300);
  });
});
```

#### 2.3.3 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| API Key加密 | 数据库中为AES-256-GCM密文 | 数据库查看 |
| 签名校验 | 非法签名被拒绝 | 安全测试 |
| SQL注入防护 | 注入被过滤或报错 | 自动化测试 |
| XSS防护 | 特殊字符被转义 | 自动化测试 |
| 权限校验 | 越权操作被拒绝 | 权限测试 |
| MCP权限开关 | 关闭后工具不可用 | 边界测试 |

---

### 模块 8.4: 异常处理测试

**目标**: 验证系统在各种异常场景下的表现

#### 2.4.1 异常场景测试矩阵

| 测试编号 | 异常场景 | 严重级别 | 预期行为 | 测试方法 |
|---------|---------|---------|---------|---------|
| EXC-001 | WebSocket断开 | P0 | 指数退避重连 | 网络模拟 |
| EXC-002 | MCP Server宕机 | P1 | 自动降级到原生API | 故障注入 |
| EXC-003 | LLM API超时 | P1 | 重试3次后返回提示 | 超时测试 |
| EXC-004 | 飞书文档无权限 | P2 | 返回权限不足提示 | 权限测试 |
| EXC-005 | 向量库查询失败 | P1 | 降级到关键词搜索 | 故障注入 |
| EXC-006 | API Key无效 | P0 | Admin告警 | 配置测试 |
| EXC-007 | 同步超时 | P2 | 跳过超时文档 | 超时测试 |
| EXC-008 | 存储空间不足 | P0 | 停止同步，告警 | 磁盘测试 |
| EXC-009 | Thread不存在 | P2 | 返回"会话不存在" | 边界测试 |
| EXC-010 | 网络闪断 | P1 | 自动重连恢复 | 网络模拟 |

#### 2.4.2 异常处理测试脚本

```typescript
// tests/failure/webhook.spec.ts
import { test, expect } from '@playwright/test';

test.describe('WebSocket断连重连测试', () => {
  test('断网后自动重连', async ({ page, context }) => {
    // 1. 建立连接
    await page.goto('/');
    await expect(page.locator('[data-testid="ws-status"]')).toContainText('已连接');

    // 2. 模拟断网
    await context.setOffline(true);
    
    // 3. 验证状态变化
    await expect(page.locator('[data-testid="ws-status"]')).toContainText('断开');

    // 4. 恢复网络
    await context.setOffline(false);

    // 5. 验证自动重连
    await page.waitForSelector('[data-testid="ws-status"]:has-text("已连接")', { 
      timeout: 10000 
    });
  });

  test('指数退避重连策略', async () => {
    // 1. 监控重连次数
    let reconnectCount = 0;
    websocket.on('reconnect', () => reconnectCount++);

    // 2. 触发断连
    await simulateNetworkFailure();

    // 3. 等待稳定后检查
    await sleep(60000); // 等待1分钟

    // 4. 验证重连次数合理（指数退避不应该太频繁）
    expect(reconnectCount).toBeLessThan(10);
  });
});

test.describe('MCP降级测试', () => {
  test('MCP不可用时自动降级', async ({ page }) => {
    // 1. 记录工具调用
    const toolCalls: string[] = [];
    page.on('tool-call', (tool) => toolCalls.push(tool.name));

    // 2. 模拟MCP Server宕机
    await mockMCPServerDown();

    // 3. 发送需要工具的请求
    await page.fill('[data-testid="message-input"]', '读取这个文档 https://...');
    await page.click('[data-testid="send-button"]');

    // 4. 验证降级：使用原生API而非MCP
    await page.waitForSelector('[data-testid="response-complete"]');
    
    // 5. 验证响应成功（降级后仍能工作）
    const response = await page.locator('[data-testid="ai-response"]').textContent();
    expect(response).toBeTruthy();
  });
});

test.describe('LLM超时处理', () => {
  test('LLM超时后重试3次', async () => {
    // 1. 记录LLM调用次数
    let llmCallCount = 0;
    llm.on('call', () => llmCallCount++);

    // 2. 模拟超时
    mockLLM.timeoutAll();

    // 3. 发送请求
    const response = await sendMessage('你好');

    // 4. 验证重试3次
    expect(llmCallCount).toBe(3);

    // 5. 验证返回友好提示
    expect(response).toContain('超时');
  });
});
```

#### 2.4.3 告警机制验证

```typescript
// tests/alert/alert.spec.ts
test.describe('告警机制测试', () => {
  test('WebSocket断连超过5分钟应告警', async () => {
    // 1. 触发WebSocket断开
    await disconnectWebSocket();

    // 2. 等待5分钟告警阈值
    await page.waitForTimeout(5 * 60 * 1000 + 1000);

    // 3. 验证告警记录
    const alerts = await getAlerts();
    expect(alerts).toContainEqual(expect.objectContaining({
      type: 'ws_disconnect',
      severity: 'P0',
    }));
  });

  test('磁盘超过90%应告警', async () => {
    // 1. 模拟磁盘空间不足
    await setDiskUsage(95);

    // 2. 触发同步操作
    await triggerSync();

    // 3. 验证告警
    const alerts = await getAlerts();
    expect(alerts).toContainEqual(expect.objectContaining({
      type: 'disk_full',
      severity: 'P0',
    }));
  });
});
```

#### 2.4.4 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| WebSocket重连 | 断连后自动重连 | 网络模拟 |
| MCP降级 | MCP宕机后自动降级 | 故障注入 |
| LLM超时 | 超时后重试3次 | 超时测试 |
| 权限不足提示 | 返回友好提示 | 权限测试 |
| 向量库降级 | 查询失败后降级搜索 | 故障注入 |
| Admin告警 | 严重问题触发告警 | 告警测试 |
| 存储告警 | 磁盘不足时停止同步 | 磁盘测试 |

---

### 模块 8.5: Bug修复

**目标**: 修复测试过程中发现的所有问题

#### 2.5.1 Bug追踪

使用GitHub Issues或Linear管理Bug，按优先级排序：

| 优先级 | 定义 | 处理时限 |
|-------|------|---------|
| P0 | 功能完全不可用 | 24小时内修复 |
| P1 | 功能受损但有替代方案 | 3天内修复 |
| P2 | 体验问题，不影响核心功能 | 下一Sprint修复 |

#### 2.5.2 Bug修复流程

```bash
# 1. 创建Bug分支
git checkout -b fix/bug-description

# 2. 编写失败的测试用例
cat > tests/bugs/gh-123.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test('Bug #123: 消息去重失效', async ({ page }) => {
  // 复现步骤
  await page.fill('[data-testid="message-input"]', 'test');
  await page.click('[data-testid="send-button"]');
  
  // 等待响应
  await page.waitForTimeout(1000);
  
  // 验证只收到一条消息（不应该重复）
  const messages = await page.locator('[data-testid="message"]').count();
  expect(messages).toBe(1);
});
EOF

# 3. 运行测试确认失败
pnpm test tests/bugs/gh-123.spec.ts

# 4. 修复代码
# ... 修改代码 ...

# 5. 运行测试确认通过
pnpm test tests/bugs/gh-123.spec.ts

# 6. 提交
git add .
git commit -m "fix: resolve message deduplication issue (#123)

- Fix duplicate message handling
- Add idempotency check for message_id

Co-Authored-By: AI <ai@example.com>"
```

#### 2.5.3 回归测试

每个Bug修复后，运行完整测试套件确保不引入新问题：

```bash
# 运行所有测试
pnpm test

# 运行E2E测试
pnpm test:e2e

# 运行性能测试
pnpm test:performance

# 运行安全测试
pnpm test:security
```

#### 2.5.4 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| P0 Bug | 全部修复 | 测试通过 |
| P1 Bug | 全部修复或确认可接受 | 测试通过 |
| 回归测试 | 全部通过 | CI验证 |
| Bug数量 | 无新增P0/P1 Bug | Bug追踪 |

---

### 模块 8.6: 文档完善

**目标**: 完善README和部署文档

#### 2.6.1 README.md结构

```markdown
# AI_Feishu - 飞书原生本地 AI 知识库

## 项目简介
[一句话描述]

## 核心特性
- 飞书原生交互
- 本地向量知识库
- 多模型路由
- MCP协议集成
- 流式响应

## 快速开始

### 环境要求
- Node.js >= 18
- SQLite (内置)
- LanceDB (内置)

### 安装
\`\`\`bash
npm install
\`\`\`

### 配置
\`\`\`bash
cp .env.example .env
# 编辑 .env 填入飞书配置
\`\`\`

### 启动
\`\`\`bash
npm run dev
\`\`\`

## 架构说明
[简要架构图]

## API文档
[链接到API文档]

## 部署
[部署指南链接]

## 测试
\`\`\`bash
# 单元测试
npm test

# E2E测试
npm run test:e2e

# 性能测试
npm run test:performance
\`\`\`

## License
MIT
```

#### 2.6.2 部署文档

```markdown
# 部署指南

## 环境准备

### 1. 安装Node.js
\`\`\`bash
# 使用nvm安装
nvm install 18
nvm use 18
\`\`\`

### 2. 安装pnpm
\`\`\`bash
npm install -g pnpm
\`\`\`

## 配置

### 飞书应用配置
1. 创建飞书企业应用
2. 配置机器人能力
3. 获取 App ID 和 App Secret
4. 配置事件订阅

### 环境变量
\`\`\`bash
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_ENCRYPT_KEY=xxx  # 用于AES加密
ADMIN_API_SECRET=xxx    # Admin面板访问密钥
\`\`\`

## 生产部署

### 方式一：直接部署
\`\`\`bash
npm run build
npm start
\`\`\`

### 方式二：Docker部署
\`\`\`bash
docker build -t ai-feishu .
docker run -d -p 3000:3000 \
  -e FEISHU_APP_ID=xxx \
  -e FEISHU_APP_SECRET=xxx \
  ai-feishu
\`\`\`

### 方式三：PM2部署
\`\`\`bash
npm install -g pm2
pm2 start npm --name "ai-feishu" -- start
pm2 save
\`\`\`

## 验证

### 健康检查
\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

### 日志查看
\`\`\`bash
pm2 logs ai-feishu
\`\`\`
```

#### 2.6.3 API文档

```markdown
# API文档

## 认证
所有API需要携带Bearer Token:
\`\`\`
Authorization: Bearer <ADMIN_API_SECRET>
\`\`\`

## 健康检查

### GET /api/admin/health
\`\`\`json
{
  "status": "ok",
  "wsConnected": true,
  "mcpConnected": true,
  "vectorDbStatus": "ready",
  "currentModel": "gpt-4o"
}
\`\`\`

## 配置管理

### GET /api/admin/config
### PUT /api/admin/config/feishu

## 模型管理

### GET /api/admin/models
### POST /api/admin/models
### PUT /api/admin/models/:id
### DELETE /api/admin/models/:id

## 知识库

### GET /api/admin/kb/folders
### POST /api/admin/kb/folders
### DELETE /api/admin/kb/folders/:id
### POST /api/admin/kb/sync
### GET /api/admin/kb/stats
```

#### 2.6.4 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| README完整 | 包含安装、配置、运行说明 | 文档审查 |
| 部署文档 | 包含Docker、PM2等部署方式 | 文档审查 |
| API文档 | 包含所有API说明 | 文档审查 |
| 架构图 | 包含系统架构图 | 文档审查 |

---

## 3. 开发流程

### Phase 1: 测试执行

每个测试模块完成后进行 **Commit 1**:

```bash
git add .
git commit -m "Sprint 8: 完成 [模块名称] 测试

- 执行测试场景X个
- 发现问题Y个

Co-Authored-By: AI <ai@example.com>"
```

### Phase 2: Bug修复

发现Bug后创建修复分支，修复完成后进行 **Commit 2**:

```bash
git add .
git commit -m "Sprint 8: 修复 [Bug描述]

- 修复问题X
- 添加回归测试

Co-Authored-By: AI <ai@example.com>"
```

### Phase 3: 性能优化

如发现性能问题，进行优化后进行 **Commit 3**:

```bash
git add .
git commit -m "Sprint 8: 性能优化 [优化点]

- 优化项A
- 性能提升X%

Co-Authored-By: AI <ai@example.com>"
```

### Phase 4: 文档完善

完成所有文档后进行 **Commit 4**:

```bash
git add .
git commit -m "Sprint 8: 完善文档

- 完善README
- 添加部署指南
- 添加API文档

Co-Authored-By: AI <ai@example.com>"
```

---

## 4. Sprint 8 完成标准

### 模块验收清单

| 模块 | 验收状态 | 完成标准 |
|-----|---------|---------|
| 8.1 全流程测试 | [ ] | E2E测试全部通过 |
| 8.2 性能测试 | [ ] | P50≤2s，并发10用户无异常 |
| 8.3 安全测试 | [ ] | 安全测试全部通过 |
| 8.4 异常处理 | [ ] | 降级机制验证通过 |
| 8.5 Bug修复 | [ ] | 无P0/P1遗留Bug |
| 8.6 文档完善 | [ ] | README、部署文档完成 |

### Sprint交付物

- 可发布版本 (v1.0)
- 完整测试报告
- README文档
- 部署指南
- API文档
- Bug修复记录

### 版本发布

```bash
# 1. 创建发布分支
git checkout -b release/v1.0

# 2. 更新版本号
npm version 1.0.0

# 3. 创建Tag
git tag v1.0.0

# 4. 合并到main
git checkout main
git merge release/v1.0

# 5. 推送
git push origin main --tags
```

---

## 5. Sprint间依赖

**Sprint 8 是最后一个Sprint**

- **被Sprint 8 依赖**: Sprint 1-7 所有模块
- **Sprint 8 后续**: 项目交付，进入维护阶段

---

**文档版本**: v1.0  
**制定日期**: 2026-04-11  
**依据文档**: ai_feishu-PRD-正式版 v1.1
