/**
 * VectorStoreService
 *
 * Wrapper class for vector-store module-level functions.
 * Provides a service-oriented interface for vector storage operations.
 */
import { addChunks as addChunksToStore, searchChunks, deleteChunksByDocId, getChunkCount, } from './vector-store';
import { logger } from './logger';
export class VectorStoreService {
    async addChunks(chunks) {
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
    async search(queryVector, topK = 5, filter) {
        const results = await searchChunks(queryVector, topK, filter?.folderId);
        if (filter?.folderId) {
            return results.filter((r) => r.folderId === filter.folderId);
        }
        return results;
    }
    async deleteByDocId(docId) {
        await deleteChunksByDocId(docId);
        logger.debug('VectorStoreService', `Deleted chunks for docId: ${docId}`);
    }
    async getStats() {
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
//# sourceMappingURL=vector-store-service.js.map