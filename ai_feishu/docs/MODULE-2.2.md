# Module 2.2: 消息接收与解析

**所属 Sprint**: Sprint 2 - 飞书消息通道  
**状态**: ✅ 已完成  
**文件**: `src/types/message.ts`, `src/feishu/message-handler.ts`  
**测试**: `tests/message-handler.test.ts`

---

## 1. 模块概述

本模块负责解析飞书 SDK 传递的消息事件，并提供消息类型判断和去重功能。

## 2. 核心功能

| 方法 | 说明 |
|------|------|
| `parseMessage(event)` | 将 FeishuMessageEvent 解析为 ParsedMessage |
| `isDuplicate(messageId)` | 检查消息是否重复（基于 message_id） |
| `isTextMessage(parsed)` | 判断是否为文本消息 |
| `isInteractiveMessage(parsed)` | 判断是否为卡片消息 |
| `extractTextContent(parsed)` | 从消息中提取文本内容 |

## 3. 类型定义

### FeishuMessageEvent (飞书SDK原始类型)

```typescript
interface FeishuMessageEvent {
  header: FeishuMessageHeader;
  event: {
    sender: FeishuMessageSender;
    receiver: { receiver_id: { open_id: string }; receiver_type: 'user' | 'bot' };
    message: FeishuMessage;
  };
}
```

### ParsedMessage (内部解析后类型)

```typescript
interface ParsedMessage {
  eventId: string;           // 事件ID
  messageId: string;        // 消息ID
  rootId: string;            // Thread根消息ID
  parentId: string;          // 父消息ID
  chatId: string;           // 会话ID
  chatType: 'p2p' | 'group'; // 会话类型
  messageType: 'text' | 'post' | 'interactive'; // 消息类型
  content: unknown;          // 解析后的消息内容
  senderOpenId: string;       // 发送者OpenID
  senderType: 'user' | 'bot'; // 发送者类型
  timestamp: string;         // 时间戳
}
```

## 4. 使用方式

```typescript
import { MessageHandler } from './feishu/message-handler';

const handler = new MessageHandler();

// 在 WSManager 的事件处理器中调用
wsManager.registerHandler('im.message.receive_v1', async (data) => {
  const parsed = handler.parseMessage(data);
  
  // 检查重复
  if (handler.isDuplicate(parsed.messageId)) {
    console.log('Duplicate message, skipping');
    return;
  }
  
  // 根据消息类型处理
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

## 6. 测试覆盖

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

## 7. 相关文档

- Sprint 2 规划: `docs/sprints/Sprint-02-飞书消息通道.md`
- Module 2.1: `docs/MODULE-2.1.md`
