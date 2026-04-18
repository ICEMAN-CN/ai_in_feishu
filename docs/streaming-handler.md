# StreamingHandler 模块

流式响应处理器，负责将 LLM 的流式输出通过 Feishu 卡片逐步展示给用户。

## 核心功能

- 流式响应处理 (300ms 间隔更新)
- 交互式卡片更新
- 消息截断 (通过 ContextManager)
- 错误处理与恢复

## 类签名

```typescript
export interface StreamingHandlerConfig {
  updateIntervalMs: number;
}

export class StreamingHandler {
  constructor(
    private llmRouter: LLMRouter,
    private sessionManager: SessionManager,
    private messageService: MessageService,
    config?: Partial<StreamingHandlerConfig>
  );
}
```

## 主要方法

### handleUserMessage(chatId, threadId, userMessage)

处理用户消息，执行完整的流式响应流程。

```typescript
await streamingHandler.handleUserMessage(
  'chat_123',      // chatId: 飞书会话ID
  'thread_456',    // threadId: 线程ID
  '用户输入'        // userMessage: 用户消息
);
```

**流程:**
1. 通过 threadId 获取 Session
2. 通过 ContextManager 截断过长消息
3. 发送初始卡片 (显示 "正在思考...")
4. 流式生成响应，300ms 间隔更新卡片
5. 生成完成后，发送最终卡片 (移除光标)
6. 更新 Session 消息计数

## 卡片结构

### 流式卡片 (中间状态)

```json
{
  "schema": "2.0",
  "card": {
    "header": {
      "title": { "tag": "plain_text", "content": "🤖 GPT-4o" },
      "template": "grey"
    },
    "elements": [
      { "tag": "div", "text": { "tag": "lark_md", "content": "响应内容▌" }, "id": "response_content" },
      { "tag": "hr", "id": "divider" },
      { "tag": "note", "elements": [{ "tag": "plain_text", "content": "流式输出中..." }] }
    ]
  }
}
```

### 最终卡片

```json
{
  "schema": "2.0",
  "card": {
    "header": {
      "title": { "tag": "plain_text", "content": "🤖 GPT-4o" },
      "template": "grey"
    },
    "elements": [
      { "tag": "div", "text": { "tag": "lark_md", "content": "完整响应内容" }, "id": "response_content" }
    ]
  }
}
```

### 错误卡片

```json
{
  "schema": "2.0",
  "card": {
    "header": {
      "title": { "tag": "plain_text", "content": "❌ 错误" },
      "template": "red"
    },
    "elements": [
      { "tag": "div", "text": { "tag": "lark_md", "content": "**Stream interrupted:**\n\n错误信息" } }
    ]
  }
}
```

## 依赖关系

```
StreamingHandler
├── LLMRouter (流式生成)
├── SessionManager (会话管理)
├── MessageService (卡片发送/更新)
└── ContextManager (消息截断) - 已在内部使用
```

## 配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| updateIntervalMs | 300 | 卡片更新间隔 (毫秒) |

## 使用示例

```typescript
import { StreamingHandler } from './services/streaming-handler';
import { LLMRouter } from './services/llm-router';
import { SessionManager } from './core/session-manager';
import { MessageService } from './feishu/message-service';

const streamingHandler = new StreamingHandler(
  llmRouter,
  sessionManager,
  messageService,
  { updateIntervalMs: 300 }
);

// 处理用户消息
await streamingHandler.handleUserMessage(chatId, threadId, userMessage);
```

## 注意事项

- 使用 ContextManager 自动截断超过 10000 字符的消息
- 流式更新使用 ▌ 作为光标指示器
- 错误时会发送红色错误卡片，不会中断应用
- Session 消息计数在流式结束后更新
