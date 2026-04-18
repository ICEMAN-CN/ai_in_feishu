# ContextManager 模块

上下文管理器，负责消息截断、历史管理和 Token 预算计算，确保对话上下文符合模型限制。

## 核心功能

- 消息长度截断 (最大 10000 字符)
- 对话历史截断 (保留最近 20 条)
- Token 预算计算 (预留 20% 给系统 prompt)
- Token 数量估算

## 类签名

```typescript
export interface ContextConfig {
  maxMessageLength: number;      // 最大消息长度
  threadMessageLimit: number;    // 线程消息限制
  maxRetrievalChunks: number;    // 最大检索块数
  tokenBudgetPercent: number;     // Token 预算百分比
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export class ContextManager {
  constructor();
}
```

## 主要方法

### truncateMessage(content: string): string

截断超过最大长度的消息。

```typescript
const truncated = contextManager.truncateMessage(longMessage);
// 如果超过 10000 字符，返回截断后的内容 + [消息已截断...]
```

### truncateHistory(messages: Message[], limit?: number): Message[]

截断对话历史，保留最近的消息。

```typescript
const truncated = contextManager.truncateHistory(messages);
// 默认保留最近 20 条

const truncated5 = contextManager.truncateHistory(messages, 5);
// 指定保留最近 5 条
```

### calculateTokenBudget(contextWindow: number): number

计算可用 Token 预算 (预留 20% 给系统 prompt)。

```typescript
const budget = contextManager.calculateTokenBudget(10000);
// 返回 8000 (80% of 10000)
```

### truncateForTokenBudget(content: string, contextWindow: number, currentTokens: number): string

根据 Token 预算截断内容。

```typescript
const truncated = contextManager.truncateForTokenBudget(
  longContent,  // 内容
  10000,       // 上下文窗口大小
  800          // 当前已用 tokens
);
```

### estimateTokens(text: string): number

估算 Token 数量。

```typescript
const tokens = contextManager.estimateTokens('你好世界');
// 中文: 4 字符 × 0.5 = 2 tokens

const tokens2 = contextManager.estimateTokens('hello world');
// 英文: 11 字符 × 0.25 = 3 tokens (向上取整)
```

### getConfig(): ContextConfig

获取当前配置。

```typescript
const config = contextManager.getConfig();
```

### updateConfig(config: Partial<ContextConfig>): void

更新配置。

```typescript
contextManager.updateConfig({ maxMessageLength: 5000 });
```

## Token 估算规则

| 字符类型 | 估算方式 |
|----------|----------|
| 中文字符 | 2 字符 ≈ 1 token |
| 英文字符 | 4 字符 ≈ 1 token |

## 配置

| 配置项 | 默认值 | 环境变量 | 说明 |
|--------|--------|----------|------|
| maxMessageLength | 10000 | MAX_MESSAGE_LENGTH | 最大消息长度 |
| threadMessageLimit | 20 | THREAD_MESSAGE_LIMIT | 线程消息限制 |
| maxRetrievalChunks | 5 | MAX_RETRIEVAL_CHUNKS | 最大检索块数 |
| tokenBudgetPercent | 0.2 | - | 预留百分比 |

## 使用示例

```typescript
import { contextManager } from './services/context-manager';

// 截断过长消息
const userMessage = '...'; // 超过 10000 字符
const truncated = contextManager.truncateMessage(userMessage);

// 截断对话历史
const history = await getConversationHistory();
const truncatedHistory = contextManager.truncateHistory(history);

// 准备 LLM 调用
const systemPrompt = '你是 AI 助手';
const budget = contextManager.calculateTokenBudget(4096);
const truncatedContent = contextManager.truncateForTokenBudget(
  retrievedContext,
  4096,
  contextManager.estimateTokens(systemPrompt)
);
```

## 单例导出

```typescript
export const contextManager = new ContextManager();
```

应用可直接导入使用，无需实例化。
