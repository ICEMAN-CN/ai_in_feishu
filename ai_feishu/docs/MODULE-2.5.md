# Module 2.5: 飞书回调API

**所属 Sprint**: Sprint 2 - 飞书消息通道  
**状态**: ✅ 已完成  
**文件**: 
- `src/routers/callback.ts` - 回调路由
- `src/index.ts` - 服务入口
**测试**: `tests/callback.test.ts`

---

## 1. 模块概述

本模块提供飞书回调 API，用于接收飞书服务器推送的事件消息。

## 2. 核心功能

### CallbackRouter 类

| 方法 | 说明 |
|------|------|
| `getApp()` | 获取 Hono 应用实例 |
| `onMessage(handler)` | 注册消息处理器 |
| `offMessage(handler)` | 注销消息处理器 |

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/feishu` | POST | 飞书事件回调接口 |
| `/health` | GET | 健康检查接口 |

### 处理流程

```
1. 接收 POST /feishu 请求
2. 验证签名 (verifyFeishuSignature)
3. 解析消息体 (JSON)
4. 跳过非消息事件
5. 跳过机器人消息
6. 去重检查 (isDuplicate)
7. 触发消息事件 (emit)
```

## 3. 使用方式

### 启动回调服务器

```typescript
import { serve } from '@hono/node-server';
import { CallbackRouter } from './routers/callback';

const callbackRouter = new CallbackRouter();

callbackRouter.onMessage(async (parsed) => {
  console.log(`收到消息: ${parsed.messageId}`);
  // 处理消息...
});

serve({
  fetch: callbackRouter.getApp().fetch,
  port: 3000,
});
```

### 挂载到现有应用

```typescript
import { CallbackRouter } from './routers/callback';

const callbackRouter = new CallbackRouter();
const app = new Hono();

app.route('/callback', callbackRouter.getApp());
```

## 4. 请求格式

### 飞书回调请求头

| 头信息 | 说明 |
|--------|------|
| `X-Lark-Request-Timestamp` | 请求时间戳 |
| `X-Lark-Request-Signature` | 签名 |

### 请求体示例

```json
{
  "schema": "2.0",
  "event_id": "evt_123",
  "event_type": "im.message.receive_v1",
  "create_time": "1775991728000",
  "event": {
    "sender": {
      "id": { "open_id": "user_456" },
      "sender_type": "user"
    },
    "message": {
      "message_id": "msg_001",
      "root_id": "msg_001",
      "chat_id": "chat_123",
      "chat_type": "p2p",
      "message_type": "text",
      "content": "{\"text\":\"Hello\"}"
    }
  }
}
```

## 5. 响应格式

| 状态码 | 说明 |
|--------|------|
| 200 | 成功处理 |
| 400 | 请求体解析失败 |
| 401 | 签名验证失败 |

## 6. 测试覆盖

| 测试场景 | 状态 |
|---------|------|
| GET /health 返回 {status: "ok"} | ✅ |
| POST /feishu 解析消息正确 | ✅ |
| 跳过非消息事件 | ✅ |
| 跳过机器人消息 | ✅ |
| 用户消息触发事件 | ✅ |
| 重复消息去重 | ✅ |

**总测试数**: 6

## 7. 联调验证

```bash
# 启动服务
npx tsx src/index.ts

# 健康检查
curl http://localhost:3000/health
# 返回: {"status":"ok"}

# 发送测试消息
curl -X POST http://localhost:3000/feishu \
  -H "Content-Type: application/json" \
  -d '{"event_type":"im.message.receive_v1","event":{"sender":{"id":{"open_id":"user_123"},"sender_type":"user"},"message":{"message_id":"msg_test","chat_id":"chat_123","chat_type":"p2p","message_type":"text","content":"{\"text\":\"hello\"}"}}}'
# 返回: {"code":0,"msg":"success"}
```

## 8. 相关文档

- Sprint 2 规划: `docs/sprints/Sprint-02-飞书消息通道.md`
- Module 2.1: `docs/MODULE-2.1.md`
- Module 2.2: `docs/MODULE-2.2.md`
- Module 2.3: `docs/MODULE-2.3.md`
- Module 2.4: `docs/MODULE-2.4.md`
