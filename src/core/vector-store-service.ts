/**
 * VectorStoreService
 *
 * Wrapper class for vector-store module-level functions.
 * Provides a service-oriented interface for vector storage operations.
 */

import {
  addChunks as addChunksToStore,
  searchChunks,
  deleteChunksByDocId,
  getChunkCount,
  type SearchResult as StoreSearchResult,
} from './vector-store';
import { logger } from './logger';

export interface VectorChunkInput {
  docId: string;
  docTitle: string;
  docUrl: string;
  folderId: string;
  textChunk: string;
  tokenCount: number;
  vector: number[];
  docUpdatedAt: number;
  chunkIndex: number;
  syncStatus: string;
}

export interface SearchResult {
  id: number;
  docId: string;
  docTitle: string;
  docUrl: string;
  folderId: string;
  textChunk: string;
  tokenCount: number;
  docUpdatedAt: number;
  chunkIndex: number;
  createdAt: number;
  _distance?: number;
}

export interface Stats {
  totalChunks: number;
  totalDocuments: number;
}

export class VectorStoreService {
  async addChunks(chunks: VectorChunkInput[]): Promise<void> {
    const chunksWithTimestamps = chunks.map((chunk) => ({
      docId: chunk.docId,
      docTitle: chunk.docTitle,
      docUrl: chunk.docUrl,
      folderId: chunk.folderId,
      textChunk: chunk.textChunk,
      tokenCount: chunk.tokenCount,
      vector: chunk.vector,
      docUpdatedAt: chunk.docUpdatedAt,
      chunkIndex: chunk.chunkIndex,
      syncStatus: chunk.syncStatus,
      createdAt: Date.now(),
    }));

    await addChunksToStore(chunksWithTimestamps);
    logger.debug('VectorStoreService', `Added ${chunks.length} chunks`);
  }

  async search(
    queryVector: number[],
    topK: number = 5,
    filter?: { folderId?: string }
  ): Promise<SearchResult[]> {
    const results = await searchChunks(queryVector, topK, filter?.folderId);

    if (filter?.folderId) {
      return results.filter((r) => r.folderId === filter.folderId);
    }

    return results;
  }

  async deleteByDocId(docId: string): Promise<void> {
    await deleteChunksByDocId(docId);
    logger.debug('VectorStoreService', `Deleted chunks for docId: ${docId}`);
  }

  async getStats(): Promise<Stats> {
    const totalChunks = await getChunkCount();

    // Count distinct documents by querying the store
    // Since we don't have a direct function, we use getChunkCount as a proxy
    // The full implementation in Sprint 5 will include proper document tracking
    const totalDocuments = 0; // TODO: Implement document counting in Sprint 5

    return {
      totalChunks,
      totalDocuments,
    };
  }
}

export {};