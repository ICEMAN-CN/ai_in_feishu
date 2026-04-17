# Sprint 8.6: 安全漏洞修复

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库
**Sprint周期**: Sprint 8 的一部分
**前置依赖**: Sprint 8.1-8.5 测试完成
**Sprint目标**: 修复专家代码审查中发现的安全漏洞

---

## 1. 安全漏洞概览

### 发现的安全问题

| 严重级别 | 问题 | 文件 | 状态 |
|---------|------|------|------|
| CRITICAL | VITE_ADMIN_API_SECRET 暴露在客户端JS | admin/src/lib/api.ts | 已修复 |
| CRITICAL | ADMIN_API_KEY未设置时认证绕过 | src/routers/admin.ts | 已修复 |
| CRITICAL | ADMIN_API_KEY未设置时认证绕过 | src/routers/admin-kb.ts | 已修复 |
| CRITICAL | ADMIN_API_KEY未设置时认证绕过 | src/routers/admin-mcp.ts | 已修复 |
| HIGH | SQL注入 LIMIT子句 | src/core/config-store.ts | 已修复 |
| HIGH | SQL注入 deleteChunksByDocId | src/core/vector-store.ts | 已修复 |
| HIGH | 内存泄漏 processedMessageIds | src/routers/callback.ts | 已修复 |

---

## 2. 漏洞修复详情

### 2.1 CRITICAL: VITE_ADMIN_API_SECRET 暴露在客户端

**问题**: API密钥hardcoded在客户端JavaScript代码中，可通过浏览器DevTools提取。

**修复方案**: 实现基于登录的认证流程
- 创建登录页面 `/login`
- 使用Bearer token认证
- Token存储在内存中（非localStorage）

**相关文件**:
- `admin/src/lib/api.ts` - 移除VITE_ADMIN_API_SECRET，使用Bearer token
- `admin/src/stores/useAuthStore.ts` - 新建Zustand store管理认证状态
- `admin/src/pages/Login.tsx` - 新建登录页面
- `admin/src/components/ProtectedRoute.tsx` - 新建路由保护组件
- `admin/src/App.tsx` - 添加登录路由和保护

**认证流程**:
```
用户 → 登录页 → POST /api/admin/login → { token, expiresAt } → 存储在useAuthStore
所有API调用 → Authorization: Bearer <token>
401响应 → logout() → 重定向到 /login
```

---

### 2.2 CRITICAL: 认证绕过漏洞

**问题**: 当ADMIN_API_KEY环境变量未设置时，认证被完全绕过，任何人都可以访问管理API。

**修复方案**:
- ADMIN_API_KEY现在是启动时必需的环境变量
- 如果未设置，应用启动时抛出错误
- 所有路由都要求有效的API密钥或token

**受影响文件**:
- `src/routers/admin.ts`
- `src/routers/admin-kb.ts`
- `src/routers/admin-mcp.ts`

**修改前**:
```typescript
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

async function authMiddleware(c: any, next: () => Promise<void>) {
  if (!ADMIN_API_KEY) {
    await next();  // 认证绕过!
    return;
  }
  // ...
}
```

**修改后**:
```typescript
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
if (!ADMIN_API_KEY) {
  throw new Error('ADMIN_API_KEY environment variable is required');
}

async function authMiddleware(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  let providedKey = authHeader?.replace('Bearer ', '');
  if (!providedKey) {
    providedKey = c.req.header('X-Admin-API-Key');
  }
  if (!providedKey || providedKey !== ADMIN_API_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  await next();
}
```

---

### 2.3 HIGH: SQL注入 - LIMIT子句

**问题**: LIMIT子句使用字符串拼接，可能导致SQL注入。

**文件**: `src/core/config-store.ts`

**修复**: 使用参数化查询
```typescript
// 修改前
query += ` LIMIT ${limit}`;
const rows = getDb().prepare(query).all(sessionId);

// 修改后
const params: any[] = [sessionId];
if (limit) {
  query += ' LIMIT ?';
  params.push(limit);
}
const rows = getDb().prepare(query).all(...params);
```

---

### 2.4 HIGH: SQL注入 - deleteChunksByDocId

**问题**: docId直接拼接到SQL查询中。

**文件**: `src/core/vector-store.ts`

**修复**: 转义docId中的引号
```typescript
// 修改前
await store.table.delete(`doc_id = "${docId}"`);

// 修改后
const sanitizedDocId = docId.replace(/"/g, '\\"');
await store.table.delete(`doc_id = "${sanitizedDocId}"`);
```

---

### 2.5 HIGH: 内存泄漏

**问题**: processedMessageIds Set无界增长，清理逻辑在迭代时删除元素导致状态损坏。

**文件**: `src/routers/callback.ts`

**修复**: 使用Map替代Set实现TTL清理
```typescript
// 修改前
private processedMessageIds = new Set<string>();
private isDuplicate(messageId: string): boolean {
  if (this.processedMessageIds.has(messageId)) return true;
  this.processedMessageIds.add(messageId);
  if (this.processedMessageIds.size > 10000) {
    // 迭代时删除 - 损坏iterator状态!
    const iterator = this.processedMessageIds.values();
    for (let i = 0; i < 5000; i++) {
      const next = iterator.next();
      if (next.value) this.processedMessageIds.delete(next.value);
    }
  }
  return false;
}

// 修改后
private processedMessageIds = new Map<string, number>();
private readonly MAX_SIZE = 10000;
private readonly TTL_MS = 5 * 60 * 1000; // 5分钟

private isDuplicate(messageId: string): boolean {
  const now = Date.now();
  const timestamp = this.processedMessageIds.get(messageId);
  if (timestamp !== undefined && now - timestamp < this.TTL_MS) {
    return true;
  }
  this.processedMessageIds.set(messageId, now);
  if (this.processedMessageIds.size > this.MAX_SIZE) {
    const cutoff = now - this.TTL_MS;
    for (const [id, ts] of this.processedMessageIds) {
      if (ts < cutoff) this.processedMessageIds.delete(id);
    }
  }
  return false;
}
```

---

## 3. 新增功能

### 3.1 登录端点

**端点**: `POST /api/admin/login`

**请求**:
```json
{
  "apiKey": "your-admin-api-key"
}
```

**响应** (成功):
```json
{
  "success": true,
  "token": "xxxxx:yyyyy",
  "expiresAt": 1713000000000
}
```

**响应** (失败):
```json
{
  "success": false,
  "message": "Invalid API key"
}
```

### 3.2 Token生成

**文件**: `src/core/token.ts`

```typescript
export interface TokenData {
  token: string;
  expiresAt: number;
}

export function generateToken(): TokenData {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24小时
  const timestamp = expiresAt.toString(36);
  const random = Buffer.from(crypto.randomBytes(16)).toString('base64url');
  const token = `${timestamp}:${random}`;
  return { token, expiresAt };
}

export function isTokenValid(expiresAt: number): boolean {
  return Date.now() < expiresAt;
}
```

---

## 4. 测试更新

为支持新的认证要求，更新了以下测试文件：

- `tests/setup.ts` - 添加ADMIN_API_KEY环境变量
- `tests/routers/admin.test.ts` - 添加authRequest辅助函数
- `tests/integration-7-admin.test.ts` - 更新认证测试
- `tests/integration-3-3-3-4-3-5.test.ts` - 添加认证头
- `tests/routers/admin-mcp.test.ts` - 更新认证测试

**测试统计**:
- 修复前测试: 515 passed
- 修复后测试: 562 passed (新增认证相关测试)

---

## 5. 提交记录

| Commit | 描述 |
|--------|------|
| `17f3d1b` | [Sprint 8.1] routers/admin.ts: Require ADMIN_API_KEY at startup |
| `8fd0033` | [Sprint 8.2] core/config-store.ts: Parameterize LIMIT clause |
| `ff16458` | [Sprint 8.3] core/vector-store.ts: Escape quotes in deleteChunksByDocId |
| `1e30edb` | [Sprint 8.4] routers/callback.ts: Fix memory leak with TTL-based Map |
| `73bdeea` | [Sprint 8.5] tests: Add ADMIN_API_KEY and auth headers |
| `6011205` | [Sprint 8.6] src/core/token.ts: Add token generation utility |
| `3c328ce` | [Sprint 8.7] src/routers/admin.ts: Add POST /login endpoint |
| `04fa709` | [Sprint 8.8] routers: Fix auth bypass in admin-kb and admin-mcp |
| `4f36fbd` | [Sprint 8.9] Frontend: Implement login-based auth flow |
| `f4aab3b` | [Sprint 8.10] tests: Update admin-mcp tests for new auth |

---

## 6. 验收标准

| 验收项 | 验收条件 | 状态 |
|-------|---------|------|
| 安全漏洞修复 | 所有CRITICAL/HIGH漏洞已修复 | 通过 |
| 登录流程 | 用户可通过登录页面获取token访问API | 通过 |
| 认证强制 | ADMIN_API_KEY未设置时应用启动失败 | 通过 |
| 向后兼容 | X-Admin-API-Key头仍然支持 | 通过 |
| 测试通过 | 所有562个测试通过 | 通过 |
| 构建成功 | `npm run build`成功 | 通过 |

---

## 7. 部署注意事项

### 环境变量

确保设置以下环境变量：

```bash
# 必需 - 管理API密钥
ADMIN_API_KEY=your-secure-api-key

# 必需 - 加密密钥 (64位十六进制)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 升级步骤

1. 拉取最新代码
2. 设置新的必需环境变量 `ADMIN_API_KEY`
3. 重新构建: `npm run build`
4. 重启服务

### 前端变化

- 用户首次访问管理后台将看到登录页面
- 需要输入API密钥进行登录
- Token有效期为24小时