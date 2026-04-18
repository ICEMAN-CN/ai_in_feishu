import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { logger } from '../core/logger';

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10);

const embeddingModel = openai.textEmbeddingModel(EMBEDDING_MODEL) as any;

export class EmbeddingService {
  async embed(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: embeddingModel as any,
        value: text,
      });
      return embedding;
    } catch (error) {
      logger.error('EmbeddingService', 'embed failed:', error);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: texts,
      });
      return embeddings;
    } catch (error) {
      logger.error('EmbeddingService', 'embedBatch failed:', error);
      throw error;
    }
  }

  getDimension(): number {
    return EMBEDDING_DIMENSION;
  }
}
