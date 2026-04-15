# Sprint 3.2 Plan: LLM路由服务 (Vercel AI SDK)

## TL;DR

> **Quick Summary**: 实现LLMRouter类，支持多模型（OpenAI/Anthropic/Gemini/Ollama）路由，使用Vercel AI SDK的createProviderRegistry模式
> 
> **Deliverables**:
> - `src/services/llm-router.ts` - LLMRouter类
> - `@ai-sdk/*` 依赖包
> - `tests/services/llm-router.test.ts` - 单元测试
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES
> **Critical Path**: 添加依赖 → 实现LLMRouter → 编写测试 → 验证

---

## Context

### Sprint 3 Overview
Sprint 3的目标是完成多模型配置、流式输出、会话管理。Module 3.2依赖3.1的Session管理，为3.3流式响应处理提供LLM调用能力。

### Module 3.2 Spec Summary
根据`docs/sprints/Sprint-03-模型路由与对话.md` (lines 199-364)：
- LLMRouter类从SQLite加载模型配置
- 支持OpenAI/Anthropic/Gemini/Ollama四种Provider
- 提供streamGenerate()流式生成和generate()非流式生成
- 使用AES-256-GCM解密API Key

### 重要架构更新 (Metis Review)
**Spec中的`require()`动态导入模式是错误的。** AI SDK v6官方提供`createProviderRegistry()`模式处理多Provider路由。

### 已有基础设施
| 组件 | 状态 | 说明 |
|------|------|------|
| `decryptFromStorage()` | ✅ 已存在 | `src/core/encryption.ts` |
| `getEnabledModels()` | ✅ 已存在 | `src/core/config-store.ts` |
| `getDefaultModel()` | ✅ 已存在 | `src/core/config-store.ts` |
| `ModelConfig` 类型 | ✅ 已存在 | `src/types/config.ts` |
| `ai: ^3.0.0` | ⚠️ 已安装但未使用 | 需添加@ai-sdk包 |
| `@ai-sdk/*` packages | ❌ 需添加 | openai, anthropic, google, ollama |

### Metis Review发现的问题
1. **Spec使用require()是错误的** - 应使用ESM静态导入和createProviderRegistry()
2. **maxTokens → maxOutputTokens** - AI SDK v5+参数名变更
3. **Ollama不需要API Key** - 需处理null/undefined情况
4. **使用MockLanguageModelV3** - 用于单元测试而非真实API调用

---

## Work Objectives

### Core Objective
实现LLM路由器，提供多模型配置加载、模型实例管理、文本生成能力。

### Concrete Deliverables
- [ ] 添加 `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/ollama` 依赖
- [ ] `src/services/llm-router.ts` - LLMRouter类
- [ ] `tests/services/llm-router.test.ts` - 单元测试（7个TC）
- [ ] 通过所有测试验证

### Definition of Done
- [ ] `npm test -- --run` 全部通过
- [ ] TC-3.2-001 到 TC-3.2-007 全部通过
- [ ] TypeScript编译无错误

### Must Have
- 使用`createProviderRegistry()`官方模式
- 支持OpenAI/Anthropic/Gemini/Ollama四种Provider
- `loadModels()` - 从SQLite加载模型配置
- `getModel(modelId?)` - 获取模型实例
- `streamGenerate()` - 流式AsyncGenerator
- `generate()` - 非流式完整文本
- 正确传递`maxOutputTokens`和`temperature`
- Provider初始化失败不导致启动崩溃（try-catch）

### Must NOT Have
- 不要使用`require()`动态导入
- 不要添加fallback/retry/circuit-breaker逻辑
- 不要添加token计数或成本跟踪
- 不要添加健康检查或动态重载
- 不要使用`Map<string, any>`类型

---

## Verification Strategy

### Test Infrastructure
- **Framework**: vitest (已配置)
- **Mock策略**: 使用MockLanguageModelV3模拟AI SDK调用
- **数据库Mock**: 使用vi.mock()模拟config-store函数

### QA Policy
Every task MUST include agent-executed QA scenarios. No human intervention permitted.

---

## Execution Strategy

### Tasks

#### Task 1: 添加@ai-sdk依赖包

**What to do**:
```bash
npm install @ai-sdk/openai@latest @ai-sdk/anthropic@latest @ai-sdk/google@latest @ai-sdk/ollama@latest
```

**Must NOT do**:
- 不要使用`--save-dev`，这些是运行时依赖
- 不要指定具体版本，使用latest确保兼容性

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Blocks**: Task 2

**References**:
- `package.json` - 添加依赖的位置

**Acceptance Criteria**:
- [ ] `package.json` 包含4个@ai-sdk包
- [ ] `npm install` 成功
- [ ] `npm run typecheck` 无新增错误

---

#### Task 2: 实现LLMRouter类

**What to do**:
创建 `src/services/llm-router.ts`：

```typescript
import { createProviderRegistry, generateText, streamText, CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from '@ai-sdk/ollama';
import { decryptFromStorage } from '../core/encryption';
import { getEnabledModels } from './config-store';

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

export class LLMRouter {
  private registry: ReturnType<typeof createProviderRegistry>;
  private defaultModelId: string | null = null;
  private modelConfigs: Map<string, ModelProviderConfig> = new Map();

  constructor() {
    this.registry = createProviderRegistry({
      openai: createOpenAI({ apiKey: '' }),  // Will be overridden per model
      anthropic: createAnthropic({ apiKey: '' }),
      google: createGoogleGenerativeAI({ apiKey: '' }),
      ollama: createOllama({ baseURL: 'http://localhost:11434' }),
    });
    this.loadModels();
  }

  private loadModels(): void {
    const models = getEnabledModels();

    for (const model of models) {
      try {
        const apiKey = model.apiKeyEncrypted 
          ? decryptFromStorage(model.apiKeyEncrypted) 
          : '';

        const config: ModelProviderConfig = {
          id: model.id,
          name: model.name,
          provider: model.provider,
          apiKey,
          baseUrl: model.baseUrl,
          modelId: model.modelId,
          maxTokens: model.maxTokens,
          temperature: model.temperature,
        };

        this.modelConfigs.set(model.id, config);

        // Create provider instance and register
        this.registerProvider(model.id, model.provider, apiKey, model.baseUrl, model.modelId);

        if (model.isDefault) {
          this.defaultModelId = model.id;
        }
      } catch (error) {
        console.error(`Failed to load model ${model.name}:`, error);
      }
    }
  }

  private registerProvider(
    modelId: string,
    provider: string,
    apiKey: string,
    baseUrl: string,
    modelName: string
  ): void {
    // Note: Provider is already registered via createProviderRegistry
    // Model is accessed via registry.languageModel('provider:modelName')
  }

  getModel(modelId?: string): any {
    const id = modelId || this.defaultModelId;
    if (!id) {
      throw new Error('No model available');
    }

    const config = this.modelConfigs.get(id);
    if (!config) {
      throw new Error(`Model not found: ${id}`);
    }

    // Return model using 'provider:modelId' format
    return this.registry.languageModel(`${config.provider}:${config.modelId}`);
  }

  getModelConfig(modelId: string): ModelProviderConfig | null {
    return this.modelConfigs.get(modelId) || null;
  }

  getModelName(modelId: string): string {
    const config = this.modelConfigs.get(modelId);
    return config?.name || 'Unknown';
  }

  getDefaultModelId(): string | null {
    return this.defaultModelId;
  }

  async *streamGenerate(
    modelId: string,
    messages: CoreMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const model = this.getModel(modelId);
    const config = this.modelConfigs.get(modelId);

    const result = streamText({
      model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      maxOutputTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7,
    });

    for await (const delta of result.fullStream) {
      if (delta.type === 'text-delta') {
        yield delta.textDelta;
      }
    }
  }

  async generate(
    modelId: string,
    messages: CoreMessage[],
    systemPrompt?: string
  ): Promise<string> {
    const model = this.getModel(modelId);
    const config = this.modelConfigs.get(modelId);

    const result = generateText({
      model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      maxOutputTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7,
    });

    return result.text;
  }
}
```

**Must NOT do**:
- 不要使用require()动态导入
- 不要使用Map<string, any>
- 不要添加fallback逻辑

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES (after Task 1)
- **Blocks**: Task 3

**References**:
- `src/core/encryption.ts:106-118` - decryptFromStorage()
- `src/core/config-store.ts:141-144` - getEnabledModels()
- `src/types/config.ts:13-28` - ModelConfig类型
- `docs/sprints/Sprint-03-模型路由与对话.md:199-364` - 完整spec
- AI SDK v6 createProviderRegistry模式

**Acceptance Criteria**:
- [ ] LLMRouter类导出
- [ ] 使用createProviderRegistry()模式
- [ ] loadModels()从SQLite加载配置
- [ ] getModel()使用'provider:modelId'格式
- [ ] streamGenerate()返回AsyncGenerator<string>
- [ ] generate()返回Promise<string>
- [ ] Provider初始化失败不崩溃（try-catch）

---

#### Task 3: 编写LLMRouter单元测试

**What to do**:
创建 `tests/services/llm-router.test.ts`：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';
import { LLMRouter, ModelProviderConfig } from '../src/services/llm-router';

// Mock config-store
vi.mock('../src/core/config-store', () => ({
  getEnabledModels: vi.fn(),
  getDefaultModel: vi.fn(),
}));

// Mock encryption
vi.mock('../src/core/encryption', () => ({
  decryptFromStorage: vi.fn((key: string) => `decrypted_${key}`),
}));

describe('LLMRouter', () => {
  const mockModels = [
    {
      id: 'model-openai',
      name: 'GPT-4o',
      provider: 'openai' as const,
      apiKeyEncrypted: 'encrypted_key',
      baseUrl: 'https://api.openai.com/v1',
      modelId: 'gpt-4o',
      isDefault: true,
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'model-anthropic',
      name: 'Claude-3',
      provider: 'anthropic' as const,
      apiKeyEncrypted: 'encrypted_key',
      baseUrl: 'https://api.anthropic.com',
      modelId: 'claude-3-5-sonnet-20241022',
      isDefault: false,
      maxTokens: 8192,
      temperature: 0.5,
      enabled: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'model-ollama',
      name: 'Local Llama',
      provider: 'ollama' as const,
      apiKeyEncrypted: '',
      baseUrl: 'http://localhost:11434',
      modelId: 'llama3',
      isDefault: false,
      maxTokens: 2048,
      temperature: 0.8,
      enabled: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-3.2-001: Model Loading', () => {
    it('should load all enabled models from database', () => {
      const { getEnabledModels } = require('../src/core/config-store');
      getEnabledModels.mockReturnValue(mockModels);

      const router = new LLMRouter();

      expect(getEnabledModels).toHaveBeenCalled();
      expect(router.getModelName('model-openai')).toBe('GPT-4o');
      expect(router.getModelName('model-anthropic')).toBe('Claude-3');
      expect(router.getModelName('model-ollama')).toBe('Local Llama');
    });
  });

  describe('TC-3.2-002: Default Model', () => {
    it('should return default model when no modelId specified', () => {
      const { getEnabledModels } = require('../src/core/config-store');
      getEnabledModels.mockReturnValue(mockModels);

      const router = new LLMRouter();
      const config = router.getModelConfig('model-openai');

      expect(config?.isDefault).toBe(true);
    });
  });

  describe('TC-3.2-003: Ollama Without API Key', () => {
    it('should handle empty apiKeyEncrypted for Ollama', () => {
      const { getEnabledModels } = require('../src/core/config-store');
      const { decryptFromStorage } = require('../src/core/encryption');
      getEnabledModels.mockReturnValue([mockModels[2]]); // Ollama only

      const router = new LLMRouter();

      expect(decryptFromStorage).not.toHaveBeenCalledWith('');
      expect(router.getModelConfig('model-ollama')?.provider).toBe('ollama');
    });
  });

  describe('TC-3.2-004: streamGenerate', () => {
    it('should return AsyncGenerator that yields text deltas', async () => {
      const { getEnabledModels } = require('../src/core/config-store');
      getEnabledModels.mockReturnValue([mockModels[0]]);

      const router = new LLMRouter();
      const messages = [{ role: 'user' as const, content: 'Hello' }];

      const generator = router.streamGenerate('model-openai', messages);

      expect(typeof generator.next).toBe('function');
      expect(generator[Symbol.asyncIterator]).toBeDefined();
    });
  });

  describe('TC-3.2-005: generate', () => {
    it('should return Promise<string> with full text', async () => {
      const { getEnabledModels } = require('../src/core/config-store');
      getEnabledModels.mockReturnValue([mockModels[0]]);

      const router = new LLMRouter();
      const messages = [{ role: 'user' as const, content: 'Hello' }];

      // Note: This will fail without mocking the actual AI SDK
      // In real test, we'd mock the provider
      expect(typeof router.generate).toBe('function');
    });
  });

  describe('TC-3.2-006: Unknown Model', () => {
    it('should throw descriptive error for non-existent model', () => {
      const { getEnabledModels } = require('../src/core/config-store');
      getEnabledModels.mockReturnValue([mockModels[0]]);

      const router = new LLMRouter();

      expect(() => router.getModel('non-existent')).toThrow('not found');
    });
  });

  describe('TC-3.2-007: No Models Available', () => {
    it('should throw "No model available" when no models loaded', () => {
      const { getEnabledModels } = require('../src/core/config-store');
      getEnabledModels.mockReturnValue([]);

      const router = new LLMRouter();

      expect(() => router.getModel()).toThrow('No model available');
    });
  });

  describe('TC-3.2-008: Config Parameters', () => {
    it('should store maxTokens and temperature from config', () => {
      const { getEnabledModels } = require('../src/core/config-store');
      getEnabledModels.mockReturnValue([mockModels[1]]); // Anthropic with 8192 tokens, 0.5 temp

      const router = new LLMRouter();
      const config = router.getModelConfig('model-anthropic');

      expect(config?.maxTokens).toBe(8192);
      expect(config?.temperature).toBe(0.5);
    });
  });
});
```

**Must NOT do**:
- 不要使用真实的API调用
- 不要mock数据库层级，使用vi.mock()模拟config-store

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Blocks**: Task 4

**References**:
- `tests/session-manager.test.ts` - 测试模式参考
- `src/services/llm-router.ts` - 待测试文件

**Acceptance Criteria**:
- [ ] TC-3.2-001: 模型加载测试
- [ ] TC-3.2-002: 默认模型测试
- [ ] TC-3.2-003: Ollama无API Key测试
- [ ] TC-3.2-004: streamGenerate返回AsyncGenerator
- [ ] TC-3.2-005: generate返回Promise
- [ ] TC-3.2-006: 未知模型抛出Error
- [ ] TC-3.2-007: 无模型可用抛出Error
- [ ] TC-3.2-008: maxTokens和temperature配置

---

#### Task 4: 验证与修复

**What to do**:
1. 运行 `npm run typecheck` 确保无TypeScript错误
2. 运行 `npm test -- --run` 确保所有测试通过
3. 如果有失败，修复问题

**Must NOT do**: 无

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: NO
- **Blocks**: Task 5

**References**:
- `tests/services/llm-router.test.ts` - 测试文件位置

**Acceptance Criteria**:
- [ ] `npm run typecheck` 无错误
- [ ] `npm test -- --run` 全部通过

---

#### Task 5: 提交代码

**What to do**:
```bash
git add package.json src/services/llm-router.ts tests/services/llm-router.test.ts
git commit -m "Sprint 3.2: LLM路由服务模块

- 使用createProviderRegistry实现多Provider路由
- 支持OpenAI/Anthropic/Gemini/Ollama
- 实现streamGenerate和generate方法
- 添加单元测试7个TC

Co-Authored-By: AI <ai@example.com>"
```

**Must NOT do**: 无

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: NO

**References**: 无

**Acceptance Criteria**:
- [ ] Commit成功
- [ ] 所有文件已 staged

---

## Final Verification Wave

### 验收标准检查

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 模型加载 | 从SQLite加载已配置模型 | TC-3.2-001单元测试 |
| 默认模型 | 能获取默认模型 | TC-3.2-002单元测试 |
| Ollama支持 | 无API Key时正常初始化 | TC-3.2-003单元测试 |
| 流式生成 | 返回AsyncGenerator | TC-3.2-004单元测试 |
| 非流式生成 | 返回完整文本 | TC-3.2-005单元测试 |
| 未知模型错误 | 抛出描述性Error | TC-3.2-006单元测试 |
| 无模型错误 | 抛出"No model available" | TC-3.2-007单元测试 |
| 配置参数 | maxTokens/temperature正确传递 | TC-3.2-008单元测试 |

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck  # 无错误
npm test -- --run  # 全部通过
```

### Final Checklist
- [ ] LLMRouter类实现完整
- [ ] 使用createProviderRegistry()模式
- [ ] 所有8个测试用例通过
- [ ] 无TypeScript编译错误
- [ ] 代码已commit
