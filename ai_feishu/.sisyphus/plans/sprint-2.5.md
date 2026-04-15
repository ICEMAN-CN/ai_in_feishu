# Sprint 2.5: 飞书回调API

## TL;DR

实现飞书回调路由，接收并处理飞书消息事件。

## Context

### 目标
完成 Sprint 2 的最后一个模块：飞书回调API (`src/routers/callback.ts`)

### 已有组件
- `src/feishu/validator.ts` - `verifyFeishuSignature()`
- `src/feishu/message-handler.ts` - MessageHandler (已实现 parseMessage, isDuplicate)
- `src/feishu/card-builder.ts` - CardBuilder
- `src/feishu/message-service.ts` - MessageService
- `src/core/ws-manager.ts` - FeishuWSManager (SDK-based)

### 已有文件
- `src/routers/callback.ts` - 框架已创建
- `src/app.ts` - 框架已创建
- `src/index.ts` - 框架已创建

---

## TODOs

- [x] 1. 修复 TypeScript 编译错误

  **What to do**:
  - 修复 `src/feishu/message-handler.ts:43` - `iterator.next().value` 可能是 undefined
  - 修复 `src/routers/callback.ts:102` - 同上
  - 修复 `src/app.ts:63` - `createFeishuClient` 缺少 `botName` 参数
  - 安装 `@hono/node-server` 或使用内置 serve

  **QA Scenarios**:
  - `npx tsc --noEmit` → 无错误

- [x] 2. 创建单元测试 `tests/callback.test.ts`

  **What to do**:
  - 测试签名验证通过/失败
  - 测试消息解析正确
  - 测试去重逻辑
  - 测试机器人消息跳过

  **QA Scenarios**:
  - `npm test -- tests/callback.test.ts` → 全部 PASS

- [x] 3. 创建集成测试脚本

  **What to do**:
  - 启动回调服务器
  - curl POST /callback/feishu 测试

  **QA Scenarios**:
  - `curl localhost:3000/callback/health` → `{"status":"ok"}`
  - `curl -X POST localhost:3000/callback/feishu` → 正确响应

- [x] 4. 编写文档 `docs/MODULE-2.5.md`

- [x] 5. Git Commit & Push

---

## 文件清单

### 创建/修改
- `src/routers/callback.ts` - 回调路由 (已创建，需检查)
- `src/app.ts` - 应用入口 (已创建，需检查)
- `src/index.ts` - 入口点 (已创建，需检查)
- `src/feishu/message-handler.ts` - 修复 TS 错误
- `tests/callback.test.ts` - 新建
- `docs/MODULE-2.5.md` - 新建

### 执行命令
```bash
cd ai_feishu
npm test -- --run
curl localhost:3000/callback/health
```

---

## 验收标准

| 测试编号 | 场景 | 预期结果 |
|---------|------|---------|
| TC-2.5-001 | POST 正确签名 | 返回 `{code: 0}` |
| TC-2.5-002 | POST 错误签名 | 返回 401 |
| TC-2.5-003 | POST 机器人消息 | 跳过处理 |
| TC-2.5-004 | POST 重复消息 | 不触发事件 |
