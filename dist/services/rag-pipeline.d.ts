import { KBFolderManager } from '../core/kb-folder-manager';
import { FeishuDocService } from './feishu-doc';
import { ChunkingService } from './chunking';
import { EmbeddingService } from './embedding';
export declare class RAGPipeline {
    private folderManager;
    private docService;
    private chunkingService;
    private embeddingService;
    constructor(folderManager: KBFolderManager, docService: FeishuDocService, chunkingService: ChunkingService, embeddingService: EmbeddingService);
    syncFolder(folderId: string): Promise<number>;
    syncDocument(documentId: string, title: string, folderId: string): Promise<void>;
    retrieve(query: string, topK?: number): Promise<string>;
    getStats(): Promise<{
        totalChunks: number;
    }>;
}
export {};
//# sourceMappingURL=rag-pipeline.d.ts.map