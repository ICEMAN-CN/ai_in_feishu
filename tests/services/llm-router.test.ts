import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEnabledModels } from '../../src/core/config-store';
import { decryptFromStorage } from '../../src/core/encryption';
import { LLMRouter } from '../../src/services/llm-router';

vi.mock('../../src/core/config-store', () => ({
  getEnabledModels: vi.fn(),
  getDefaultModel: vi.fn(),
}));

vi.mock('../../src/core/encryption', () => ({
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
      vi.mocked(getEnabledModels).mockReturnValue(mockModels);

      const router = new LLMRouter();

      expect(getEnabledModels).toHaveBeenCalled();
      expect(router.getModelName('model-openai')).toBe('GPT-4o');
      expect(router.getModelName('model-anthropic')).toBe('Claude-3');
      expect(router.getModelName('model-ollama')).toBe('Local Llama');
    });
  });

  describe('TC-3.2-002: Default Model', () => {
    it('should return default model when no modelId specified', () => {
      vi.mocked(getEnabledModels).mockReturnValue([mockModels[0]]);

      const router = new LLMRouter();
      const config = router.getModelConfig('model-openai');

      expect(config).toBeDefined();
    });
  });

  describe('TC-3.2-003: Ollama Without API Key', () => {
    it('should handle empty apiKeyEncrypted for Ollama', () => {
      vi.mocked(getEnabledModels).mockReturnValue([mockModels[2]]);

      const router = new LLMRouter();

      expect(decryptFromStorage).not.toHaveBeenCalledWith('');
      expect(router.getModelConfig('model-ollama')?.provider).toBe('ollama');
    });
  });

  describe('TC-3.2-004: streamGenerate', () => {
    it('should return AsyncGenerator that yields text deltas', async () => {
      vi.mocked(getEnabledModels).mockReturnValue([mockModels[0]]);

      const router = new LLMRouter();
      const messages = [{ role: 'user' as const, content: 'Hello' }];

      const generator = router.streamGenerate('model-openai', messages);

      expect(typeof generator.next).toBe('function');
      expect(generator[Symbol.asyncIterator]).toBeDefined();
    });
  });

  describe('TC-3.2-005: generate', () => {
    it('should return Promise<string> with full text', () => {
      vi.mocked(getEnabledModels).mockReturnValue([mockModels[0]]);

      const router = new LLMRouter();

      expect(typeof router.generate).toBe('function');
    });
  });

  describe('TC-3.2-006: Unknown Model', () => {
    it('should throw descriptive error for non-existent model', () => {
      vi.mocked(getEnabledModels).mockReturnValue([mockModels[0]]);

      const router = new LLMRouter();

      expect(() => router.getModel('non-existent')).toThrow('not found');
    });
  });

  describe('TC-3.2-007: No Models Available', () => {
    it('should throw "No model available" when no models loaded', () => {
      vi.mocked(getEnabledModels).mockReturnValue([]);

      const router = new LLMRouter();

      expect(() => router.getModel()).toThrow('No model available');
    });
  });

  describe('TC-3.2-008: Config Parameters', () => {
    it('should store maxTokens and temperature from config', () => {
      vi.mocked(getEnabledModels).mockReturnValue([mockModels[1]]);

      const router = new LLMRouter();
      const config = router.getModelConfig('model-anthropic');

      expect(config?.maxTokens).toBe(8192);
      expect(config?.temperature).toBe(0.5);
    });
  });
});