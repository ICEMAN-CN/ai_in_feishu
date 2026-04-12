# Module 2.4: 消息发送与卡片构建

**所属 Sprint**: Sprint 2 - 飞书消息通道  
**状态**: ✅ 已完成  
**文件**: 
- `src/feishu/card-builder.ts`
- `src/feishu/message-service.ts`  
**测试**: 
- `tests/card-builder.test.ts`
- `tests/message-service.test.ts`

---

## 1. 模块概述

本模块提供飞书消息发送功能，包括：
- **CardBuilder**: 飞书交互卡片的 Fluent Builder 构建器
- **MessageService**: 消息发送服务，支持文本和卡片消息

## 2. CardBuilder 核心功能

### Fluent Builder 接口

| 方法 | 说明 |
|------|------|
| `CardBuilder.new()` | 创建新的卡片构建器 |
| `.header(title, template?)` | 添加卡片头部，默认蓝色模板 |
| `.div(content)` | 添加 Markdown 文本内容 |
| `.button(text, actionId, type?, url?)` | 添加按钮，支持 primary/default 类型 |
| `.selectStatic(placeholder, options, actionId)` | 添加静态下拉选择 |
| `.hr()` | 添加水平分割线 |
| `.build()` | 构建最终卡片对象 |

### 模板颜色

```typescript
type CardTemplate = 'blue' | 'grey' | 'green' | 'orange' | 'red' | 'purple';
```

### 预置卡片

| 方法 | 说明 |
|------|------|
| `CardBuilder.sessionStarterCard(modelOptions)` | 会话启动卡片，含模型选择下拉 |
| `CardBuilder.streamingCard(modelName, initialContent?)` | 流式响应卡片 |
| `CardBuilder.archiveConfirmCard()` | 归档确认卡片，含4种归档选项 |

## 3. MessageService 接口

```typescript
export class MessageService {
  constructor(private client: Client) {}
  
  sendTextMessage(chatId: string, content: string): Promise<string>
  sendCardMessage(chatId: string, card: object): Promise<string>
  updateCardMessage(messageId: string, card: object): Promise<void>
}
```

### 消息发送流程

```
1. 调用方构造消息内容（文本或卡片）
2. MessageService 调用 SDK 发送
3. SDK 返回 message_id
4. 调用方可用于后续更新或引用
```

## 4. 使用方式

### 构建并发送卡片

```typescript
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';
import { getFeishuClient } from './feishu/client';

const client = getFeishuClient();
const messageService = new MessageService(client);

// 方式1: 使用 Fluent API
const card = CardBuilder.new()
  .header('AI 对话', 'blue')
  .div('选择一个模型开始对话')
  .button('GPT-4', 'select_gpt4', 'primary')
  .button('Claude', 'select_claude')
  .build();

await messageService.sendCardMessage('chat_123', card);

// 方式2: 使用预置卡片
const sessionCard = CardBuilder.sessionStarterCard([
  { label: 'GPT-4', value: 'gpt4' },
  { label: 'Claude', value: 'claude' },
]);
await messageService.sendCardMessage('chat_123', sessionCard);

// 方式3: 发送文本
await messageService.sendTextMessage('chat_123', 'Hello!');

// 方式4: 更新已有卡片
const updatedCard = CardBuilder.streamingCard('GPT-4', '这是更新后的内容...').build();
await messageService.updateCardMessage('msg_original_123', updatedCard);
```

## 5. 卡片结构 (Schema 2.0)

```json
{
  "schema": "2.0",
  "card": {
    "header": {
      "title": { "tag": "plain_text", "content": "标题" },
      "template": "blue"
    },
    "elements": [
      { "tag": "div", "text": { "tag": "lark_md", "content": "内容" } },
      { "tag": "action", "actions": [...] },
      { "tag": "hr" }
    ]
  }
}
```

## 6. 测试覆盖

### CardBuilder (23 tests)

| 测试场景 | 状态 |
|---------|------|
| `new()` 创建空构建器 | ✅ |
| `header()` 默认/自定义模板 | ✅ |
| `div()` 添加内容 | ✅ |
| `button()` 各种类型和URL | ✅ |
| `selectStatic()` 选项 | ✅ |
| `hr()` 分割线 | ✅ |
| `build()` 空卡片 | ✅ |
| `build()` 组装复杂卡片 | ✅ |
| `sessionStarterCard()` 静态方法 | ✅ |
| `streamingCard()` 静态方法 | ✅ |
| `archiveConfirmCard()` 静态方法 | ✅ |

### MessageService (9 tests)

| 测试场景 | 状态 |
|---------|------|
| `sendTextMessage()` 成功发送 | ✅ |
| `sendTextMessage()` 空内容 | ✅ |
| `sendTextMessage()` SDK错误传播 | ✅ |
| `sendCardMessage()` 成功发送 | ✅ |
| `sendCardMessage()` 复杂卡片 | ✅ |
| `sendCardMessage()` SDK错误传播 | ✅ |
| `updateCardMessage()` 成功更新 | ✅ |
| `updateCardMessage()` 空卡片 | ✅ |
| `updateCardMessage()` SDK错误传播 | ✅ |

**总测试数**: 32

## 7. 联调评估

**结论**: 无需联调测试

**原因**: 
- CardBuilder 是纯函数，无外部依赖
- MessageService 依赖 SDK Client，可通过 mock 完整测试
- 所有边界情况和错误场景均已覆盖

## 8. 相关文档

- Sprint 2 规划: `docs/sprints/Sprint-02-飞书消息通道.md`
- Module 2.1: `docs/MODULE-2.1.md`
- Module 2.2: `docs/MODULE-2.2.md`
- Module 2.3: `docs/MODULE-2.3.md`
