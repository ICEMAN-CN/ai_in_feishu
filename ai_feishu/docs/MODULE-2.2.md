# Module 2.2: 消息接收与解析

**所属 Sprint**: Sprint 2 - 飞书消息通道  
**状态**: ✅ 已完成（联调验证通过）  
**文件**: `src/types/message.ts`, `src/feishu/message-handler.ts`  
**测试**: `tests/message-handler.test.ts`

---

## 1. 模块概述

本模块负责解析飞书 SDK 传递的消息事件，并提供消息类型判断和去重功能。

## 2. 核心功能

| 方法 | 说明 |
|------|------|
| `parseMessage(event)` | 将 Feishu SDK 原始事件解析为 ParsedMessage |
| `isDuplicate(messageId)` | 检查消息是否重复（基于 message_id） |
| `isTextMessage(parsed)` | 判断是否为文本消息 |
| `isInteractiveMessage(parsed)` | 判断是否为卡片消息 |
| `extractTextContent(parsed)` | 从消息中提取文本内容 |

## 3. 实际 SDK 消息格式

飞书 SDK 实际发送的消息格式：

```typescript
interface FeishuMessageEvent {
  schema: '2.0';
  event_id: string;
  event_type: 'im.message.receive_v1';
  create_time: string;
  token: string;
  tenant_key: string;
  app_id: string;
  message: {
    message_id: string;
    root_id?: string;
    parent_id?: string;
    chat_id: string;
    chat_type: 'p2p' | 'group';
    message_type: 'text' | 'post' | 'interactive';
    content: string;  // JSON string
  };
  event?: {
    sender?: {
      id?: { open_id: string };
      sender_type?: 'user' | 'bot';
    };
  };
}
```

### ParsedMessage (内部解析后类型)

```typescript
interface ParsedMessage {
  eventId: string;
  messageId: string;
  rootId: string;
  parentId: string;
  chatId: string;
  chatType: 'p2p' | 'group';
  messageType: 'text' | 'post' | 'interactive';
  content: unknown;
  senderOpenId: string;
  senderType: 'user' | 'bot';
  timestamp: string;
}
```

## 4. 使用方式

```typescript
import { MessageHandler } from './feishu/message-handler';

const handler = new MessageHandler();

// 在 WSManager 的事件处理器中调用
wsManager.registerHandler('im.message.receive_v1', async (data) => {
  const parsed = handler.parseMessage(data);
  
  if (handler.isDuplicate(parsed.messageId)) {
    console.log('Duplicate message, skipping');
    return;
  }
  
  if (handler.isTextMessage(parsed)) {
    const text = handler.extractTextContent(parsed);
    console.log('Text message:', text);
  }
});
```

## 5. 去重机制

- 使用 `Set<string>` 存储已处理的 message_id
- 超过 10000 条后自动清理一半旧数据
- 防止内存无限增长

## 6. 联调验证

```bash
FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx npx tsx scripts/test-integration.ts
```

**验证结果**：
- WebSocket 长连接建立成功
- 消息接收正常
- 消息解析正常
- 文本内容提取正常

**注意**：`senderOpenId` 为空是因为飞书应用默认不返回发送者信息，需要在飞书后台配置相关权限。

## 7. 测试覆盖

| 测试项 | 状态 |
|--------|------|
| 解析文本消息 | ✅ |
| root_id 为空时使用 message_id | ✅ |
| 解析无效 JSON | ✅ |
| 解析卡片消息 | ✅ |
| 首次消息返回 false | ✅ |
| 重复消息返回 true | ✅ |
| 不同消息独立追踪 | ✅ |
| isTextMessage() | ✅ |
| isInteractiveMessage() | ✅ |
| extractTextContent() | ✅ |

**总测试数**: 15

## 8. 相关文档

- Sprint 2 规划: `docs/sprints/Sprint-02-飞书消息通道.md`
- Module 2.1: `docs/MODULE-2.1.md`
