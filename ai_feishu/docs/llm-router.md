# LLMRouter 模块

## 概述

`LLMRouter` 是 AI_Feishu 项目中的多模型路由服务，使用 Vercel AI SDK v3 实现对多种大语言模型的统一访问。

## 功能特性

- **多 Provider 支持**: OpenAI, Anthropic, Google (Gemini), Ollama
- **配置驱动**: 从 SQLite 数据库动态加载模型配置
- **流式响应**: 支持 `streamGenerate()` 流式文本生成
- **非流式生成**: 支持 `generate()` 完整文本生成
- **安全存储**: API Key 使用 AES-256-GCM 加密存储

## API 接口

### `ModelProviderConfig`

```typescript
export interface ModelProviderConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama';
  apiKey: string;
  baseUrl: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}
```

### `LLMRouter` 类

#### 构造函数

```typescript
const router = new LLMRouter();
```

#### 方法

| 方法 | 说明 | 返回类型 |
|------|------|----------|
| `getModel(modelId?)` | 获取模型实例 | `any` |
| `getModelConfig(modelId)` | 获取模型配置 | `ModelProviderConfig \| null` |
| `getModelName(modelId)` | 获取模型名称 | `string` |
| `getDefaultModelId()` | 获取默认模型 ID | `string \| null` |
| `streamGenerate(modelId, messages, systemPrompt?)` | 流式生成 | `AsyncGenerator<string>` |
| `generate(modelId, messages, systemPrompt?)` | 非流式生成 | `Promise<string>` |

## 使用示例

### 初始化并获取模型

```typescript
import { LLMRouter } from './services/llm-router';

const router = new LLMRouter();
const model = router.getModel('model-openai');
```

### 流式文本生成

```typescript
import { CoreMessage } from 'ai';

const messages: CoreMessage[] = [{ role: 'user', content: 'Hello' }];

for await (const text of router.streamGenerate('model-openai', messages)) {
  process.stdout.write(text);
}
```

### 非流式文本生成

```typescript
const result = await router.generate('model-openai', messages);
console.log(result);
```

### 使用 System Prompt

```typescript
const result = await router.generate(
  'model-openai',
  messages,
  'You are a helpful assistant.'
);
```

## Provider 配置映射

| 数据库 Provider | AI SDK Provider |
|-----------------|------------------|
| `openai` | `@ai-sdk/openai` |
| `anthropic` | `@ai-sdk/anthropic` |
| `gemini` | `@ai-sdk/google` |
| `ollama` | `@ai-sdk/openai` (OpenAI 兼容 API) |

## 错误处理

| 错误 | 条件 |
|------|------|
| `'No model available'` | 未设置默认模型且未指定 modelId |
| `'Model not found: {id}'` | 指定的模型 ID 不存在 |
| `'Unknown provider: {provider}'` | Provider 不受支持 |

## 类型说明

### 关于 `getModel()` 返回类型

`getModel()` 方法返回 `any`，这是因为 AI SDK v3 内部使用 `LanguageModelV3` 类型，但 `streamText`/`generateText` 期望 `LanguageModelV1`。这是 AI SDK v3 的已知类型兼容性问题，不影响运行时功能。

## 依赖

- `ai` - Vercel AI SDK Core
- `@ai-sdk/openai` - OpenAI Provider
- `@ai-sdk/anthropic` - Anthropic Provider
- `@ai-sdk/google` - Google Provider

## 相关文件

- `src/services/llm-router.ts` - 实现
- `tests/services/llm-router.test.ts` - 单元测试
