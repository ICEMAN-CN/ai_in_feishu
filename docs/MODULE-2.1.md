# Module 2.1: WebSocket 长连接管理

**所属 Sprint**: Sprint 2 - 飞书消息通道  
**状态**: ✅ 已完成  
**文件**: `src/core/ws-manager.ts`  
**测试**: `tests/ws-manager.test.ts`

---

## 1. 模块概述

本模块提供基于飞书官方 SDK 的 WebSocket 长连接封装，简化飞书机器人消息接收的实现。

## 2. 核心功能

| 方法 | 说明 |
|------|------|
| `registerHandler(eventType, handler)` | 注册事件处理器（必须在 start 前调用） |
| `start()` | 启动 WebSocket 长连接 |
| `stop()` | 停止 WebSocket 连接 |
| `getClient()` | 获取飞书 API Client（用于发送消息） |
| `isConnected()` | 获取连接状态 |

## 3. 使用方式

```typescript
import { FeishuWSManager } from './core/ws-manager';

const wsManager = new FeishuWSManager({
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
});

// 注册消息事件处理器
wsManager.registerHandler('im.message.receive_v1', async (data) => {
  console.log('收到消息:', data);
});

// 启动连接
wsManager.start();

// 发送消息
const client = wsManager.getClient();
await client.im.v1.message.create({ ... });
```

## 4. SDK 使用规范

- ✅ 使用 `WSClient` 进行 WebSocket 连接
- ✅ 使用 `EventDispatcher` 注册事件处理器
- ✅ SDK 内部自动处理重连，无需外部管理
- ✅ WSClient 和 Client 使用相同的 appId/appSecret

## 5. 事件类型

常用事件：

| 事件 | 说明 |
|------|------|
| `im.message.receive_v1` | 接收消息 |

## 6. 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `appId` | string | ✅ | 飞书应用 App ID |
| `appSecret` | string | ✅ | 飞书应用 App Secret |
| `loggerLevel` | LoggerLevel | ❌ | 日志级别，默认 LoggerLevel.warn |

## 7. 错误处理

- `start()` 失败时自动清理已创建的资源
- `getClient()` 在未初始化时抛出明确错误
- 多次调用 `start()` 会警告但不会崩溃

## 8. 测试覆盖

| 测试项 | 状态 |
|--------|------|
| 构造函数 | ✅ |
| isConnected() | ✅ |
| registerHandler() | ✅ |
| start() | ✅ |
| stop() | ✅ |
| getClient() | ✅ |
| 工厂函数 | ✅ |

## 9. 集成测试

```bash
FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx npx tsx scripts/test-ws-connection.ts
```

验证输出：
- `[ws] ws connect success` = WebSocket 连接成功
- `[ws] ws client ready` = 客户端就绪
- `[Message Received]` = 消息接收正常

## 10. 相关文档

- 飞书 SDK 文档: https://open.feishu.cn/document/server-docs/server-side-sdk
- Sprint 2 规划: `docs/sprints/Sprint-02-飞书消息通道.md`
