/**
 * VectorStoreService
 *
 * Wrapper class for vector-store module-level functions.
 * Provides a service-oriented interface for vector storage operations.
 */
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
export declare class VectorStoreService {
    addChunks(chunks: VectorChunkInput[]): Promise<void>;
    search(queryVector: number[], topK?: number, filter?: {
        folderId?: string;
    }): Promise<SearchResult[]>;
    deleteByDocId(docId: string): Promise<void>;
    getStats(): Promise<Stats>;
}
export {};
//# sourceMappingURL=vector-store-service.d.ts.map