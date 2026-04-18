/**
 * AI_Feishu Vector Store (LanceDB)
 *
 * Provides document chunk storage and semantic search capabilities.
 * Note: This is a simplified implementation for Phase 1 scaffolding.
 * Full vector search with proper embeddings will be implemented in Sprint 5.
 */
export interface DocumentChunk {
    id: number;
    docId: string;
    docTitle: string;
    docUrl: string;
    folderId: string;
    textChunk: string;
    tokenCount: number;
    vector: number[];
    docUpdatedAt: number;
    chunkIndex: number;
    createdAt: number;
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
interface VectorStoreInstance {
    table: any;
    db: any;
}
export declare function initVectorStore(): Promise<VectorStoreInstance>;
export declare function getVectorStore(): Promise<VectorStoreInstance>;
export declare function addChunks(chunks: Omit<DocumentChunk, 'id'>[]): Promise<void>;
export declare function searchChunks(_queryVector: number[], topK?: number, _filterFolderId?: string): Promise<SearchResult[]>;
export declare function getChunksByDocId(docId: string): Promise<SearchResult[]>;
export declare function deleteChunksByDocId(docId: string): Promise<void>;
export declare function getChunkCount(): Promise<number>;
export declare function getStats(): Promise<{
    totalChunks: number;
    totalDocuments: number;
    totalFolders: number;
}>;
export declare function closeVectorStore(): Promise<void>;
export {};
//# sourceMappingURL=vector-store.d.ts.map