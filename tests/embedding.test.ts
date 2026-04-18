import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.stubEnv('EMBEDDING_MODEL', 'text-embedding-3-small');
vi.stubEnv('EMBEDDING_DIMENSION', '1536');

const { mockEmbed, mockEmbedMany, mockEmbeddingModel } = vi.hoisted(() => {
  const model = {
    specificationVersion: 'v3',
    provider: 'openai',
    modelId: 'text-embedding-3-small',
    maxEmbeddingsPerCall: 1,
    supportsParallelCalls: true,
    doEmbed: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]] }),
  };
  return {
    mockEmbed: vi.fn(),
    mockEmbedMany: vi.fn(),
    mockEmbeddingModel: model,
  };
});

vi.mock('@ai-sdk/openai', () => ({
  openai: {
    textEmbeddingModel: vi.fn().mockReturnValue(mockEmbeddingModel),
  },
}));

vi.mock('ai', () => ({
  embed: mockEmbed,
  embedMany: mockEmbedMany,
}));

import { EmbeddingService } from '../src/services/embedding';

describe('EmbeddingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbed.mockResolvedValue({ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] });
    mockEmbedMany.mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] });
  });

  describe('TC-5.4-001: Single text embedding', () => {
    it('should return embedding array for single text', async () => {
      const service = new EmbeddingService();
      const result = await service.embed('Hello world');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);
      expect(mockEmbed).toHaveBeenCalledWith({
        model: mockEmbeddingModel,
        value: 'Hello world',
      });
    });

    it('should return number array with correct values', async () => {
      mockEmbed.mockResolvedValue({ embedding: [0.1, 0.2, 0.3] });
      const service = new EmbeddingService();

      const result = await service.embed('Test text');

      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(result.every((v: number) => typeof v === 'number')).toBe(true);
    });
  });

  describe('TC-5.4-002: Batch embedding', () => {
    it('should return array of embeddings for multiple texts', async () => {
      const service = new EmbeddingService();
      const results = await service.embedBatch(['Hello', 'World']);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(Array.isArray(results[0])).toBe(true);
      expect(Array.isArray(results[1])).toBe(true);
    });

    it('should call embedMany with correct values', async () => {
      const service = new EmbeddingService();
      const texts = ['Text 1', 'Text 2', 'Text 3'];

      await service.embedBatch(texts);

      expect(mockEmbedMany).toHaveBeenCalledWith({
        model: mockEmbeddingModel,
        values: texts,
      });
    });

    it('should handle empty batch', async () => {
      mockEmbedMany.mockResolvedValue({ embeddings: [] });
      const service = new EmbeddingService();
      const results = await service.embedBatch([]);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe('TC-5.4-003: Dimension check', () => {
    it('should return configured dimension of 1536', () => {
      const service = new EmbeddingService();
      expect(service.getDimension()).toBe(1536);
    });
  });

  describe('Error handling', () => {
    it('should throw error when embed fails', async () => {
      const service = new EmbeddingService();
      mockEmbed.mockRejectedValue(new Error('API Error'));

      await expect(service.embed('Test')).rejects.toThrow('API Error');
    });

    it('should propagate error in batch embedding', async () => {
      const service = new EmbeddingService();
      mockEmbedMany.mockRejectedValue(new Error('Batch Error'));

      await expect(service.embedBatch(['Text 1', 'Text 2'])).rejects.toThrow(
        'Batch Error'
      );
    });
  });
});
