import { KBFolderManager } from '../core/kb-folder-manager';
import { FeishuDocService } from './feishu-doc';
import { ChunkingService } from './chunking';
import { EmbeddingService } from './embedding';
import { addChunks, searchChunks, deleteChunksByDocId, getChunkCount } from '../core/vector-store';
import { logger } from '../core/logger';

const MAX_RETRIEVAL_CHUNKS = parseInt(process.env.MAX_RETRIEVAL_CHUNKS || '5', 10);

export class RAGPipeline {
  constructor(
    private folderManager: KBFolderManager,
    private docService: FeishuDocService,
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService
  ) {}

  async syncFolder(folderId: string): Promise<number> {
    const folder = this.folderManager.getFolder(folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    logger.info('RAGPipeline', `Starting sync for folder: ${folder.name} (${folderId})`);

    const documents = await this.docService.listDocumentsInFolder(folder.folderToken);
    let syncedCount = 0;

    for (const doc of documents) {
      try {
        await this.syncDocument(doc.documentId, doc.title, folder.id);
        syncedCount++;
        logger.debug('RAGPipeline', `Synced document: ${doc.title} (${doc.documentId})`);
      } catch (error) {
        logger.error('RAGPipeline', `Failed to sync document ${doc.documentId}:`, error);
      }
    }

    this.folderManager.updateLastSync(folderId, syncedCount);
    logger.info('RAGPipeline', `Sync complete for folder ${folder.name}: ${syncedCount}/${documents.length} documents`);

    return syncedCount;
  }

  async syncDocument(documentId: string, title: string, folderId: string): Promise<void> {
    const doc = await this.docService.getDocument(documentId);
    const docTitle = doc.title || title;

    logger.debug('RAGPipeline', `Syncing document: ${docTitle} (${documentId})`);

    await deleteChunksByDocId(documentId);

    const chunks = await this.chunkingService.chunkDocument(doc.content, {
      documentId,
      title: docTitle,
      url: `https://xxx.feishu.cn/docx/${documentId}`,
    });

    if (chunks.length === 0) {
      logger.debug('RAGPipeline', `No valid chunks for document: ${docTitle}`);
      return;
    }

    const texts = chunks.map(c => c.text);
    const embeddings = await this.embeddingService.embedBatch(texts);

    const now = Date.now();
    const vectorChunks = chunks.map((chunk, index) => ({
      docId: documentId,
      docTitle: docTitle,
      docUrl: `https://xxx.feishu.cn/docx/${documentId}`,
      folderId,
      textChunk: chunk.text,
      tokenCount: chunk.tokenCount,
      vector: embeddings[index],
      docUpdatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : now,
      chunkIndex: chunk.chunkIndex,
      createdAt: now,
      syncStatus: 'synced' as const,
    }));

    await addChunks(vectorChunks);
    logger.debug('RAGPipeline', `Stored ${chunks.length} chunks for document: ${docTitle}`);
  }

  async retrieve(query: string, topK: number = MAX_RETRIEVAL_CHUNKS): Promise<string> {
    const queryVector = await this.embeddingService.embed(query);
    const results = await searchChunks(queryVector, topK);

    if (results.length === 0) {
      logger.debug('RAGPipeline', `No results found for query: ${query}`);
      return '';
    }

    const formatted = results.map(r =>
      `[来源: ${r.docTitle}](${r.docUrl})\n${r.textChunk}`
    ).join('\n\n---\n\n');

    logger.debug('RAGPipeline', `Retrieved ${results.length} chunks for query: ${query}`);
    return formatted;
  }

  async getStats(): Promise<{ totalChunks: number }> {
    const totalChunks = await getChunkCount();
    return { totalChunks };
  }
}

export {};