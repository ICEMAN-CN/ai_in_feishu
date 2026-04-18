import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.stubEnv('MAX_RETRIEVAL_CHUNKS', '5');

// Define all mocks with vi.hoisted to ensure proper hoisting
const mocks = vi.hoisted(() => {
  return {
    // KBFolderManager mocks
    mockGetFolder: vi.fn(),
    mockGetAllFolders: vi.fn(),
    mockUpdateLastSync: vi.fn(),
    mockFolderManager: {
      getFolder: vi.fn(),
      getAllFolders: vi.fn(),
      updateLastSync: vi.fn(),
    },

    // FeishuDocService mocks
    mockListDocumentsInFolder: vi.fn(),
    mockGetDocument: vi.fn(),
    mockDocService: {
      listDocumentsInFolder: vi.fn(),
      getDocument: vi.fn(),
    },

    // ChunkingService mocks
    mockChunkDocument: vi.fn(),
    mockChunkingService: {
      chunkDocument: vi.fn(),
    },

    // EmbeddingService mocks
    mockEmbed: vi.fn(),
    mockEmbedBatch: vi.fn(),
    mockEmbeddingService: {
      embed: vi.fn(),
      embedBatch: vi.fn(),
    },

    // VectorStore mocks
    mockAddChunks: vi.fn(),
    mockSearchChunks: vi.fn(),
    mockDeleteChunksByDocId: vi.fn(),
    mockGetChunkCount: vi.fn(),
  };
});

// Setup mocks before import
vi.mock('../src/core/kb-folder-manager', () => ({
  KBFolderManager: vi.fn().mockImplementation(() => mocks.mockFolderManager),
}));

vi.mock('../src/services/feishu-doc', () => ({
  FeishuDocService: vi.fn().mockImplementation(() => mocks.mockDocService),
}));

vi.mock('../src/services/chunking', () => ({
  ChunkingService: vi.fn().mockImplementation(() => mocks.mockChunkingService),
}));

vi.mock('../src/services/embedding', () => ({
  EmbeddingService: vi.fn().mockImplementation(() => mocks.mockEmbeddingService),
}));

vi.mock('../src/core/vector-store', () => ({
  addChunks: mocks.mockAddChunks,
  searchChunks: mocks.mockSearchChunks,
  deleteChunksByDocId: mocks.mockDeleteChunksByDocId,
  getChunkCount: mocks.mockGetChunkCount,
}));

vi.mock('../src/core/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { RAGPipeline } from '../src/services/rag-pipeline';

describe('RAGPipeline', () => {
  let ragPipeline: RAGPipeline;

  const mockFolder = {
    id: 'folder-1',
    name: 'Test Folder',
    url: 'https://example.feishu.cn/drive/folder/abc123',
    folderToken: 'abc123',
    lastSyncAt: undefined,
    lastSyncDocCount: 0,
    syncEnabled: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  const mockDoc = {
    documentId: 'doc-1',
    title: 'Test Document',
    content: 'This is a test document with enough content to be chunked properly since it needs to be over 100 characters to pass the chunking filter.',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockChunks = [
    { text: 'This is a test document with enough content to be chunked properly since it needs to be over 100 characters to pass the chunking filter.', tokenCount: 50, chunkIndex: 0 },
  ];

  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mocks.mockFolderManager = {
      getFolder: mocks.mockGetFolder,
      getAllFolders: mocks.mockGetAllFolders,
      updateLastSync: mocks.mockUpdateLastSync,
    };

    mocks.mockDocService = {
      listDocumentsInFolder: mocks.mockListDocumentsInFolder,
      getDocument: mocks.mockGetDocument,
    };

    mocks.mockChunkingService = {
      chunkDocument: mocks.mockChunkDocument,
    };

    mocks.mockEmbeddingService = {
      embed: mocks.mockEmbed,
      embedBatch: mocks.mockEmbedBatch,
    };

    ragPipeline = new RAGPipeline(
      mocks.mockFolderManager as any,
      mocks.mockDocService as any,
      mocks.mockChunkingService as any,
      mocks.mockEmbeddingService as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TC-5.6-001: Single folder sync', () => {
    it('should sync all documents in a folder', async () => {
      mocks.mockGetFolder.mockReturnValue(mockFolder);
      mocks.mockListDocumentsInFolder.mockResolvedValue([
        { documentId: 'doc-1', title: 'Doc 1' },
        { documentId: 'doc-2', title: 'Doc 2' },
      ]);
      mocks.mockGetDocument.mockResolvedValue(mockDoc);
      mocks.mockChunkDocument.mockResolvedValue(mockChunks);
      mocks.mockEmbedBatch.mockResolvedValue([mockEmbedding]);
      mocks.mockDeleteChunksByDocId.mockResolvedValue(undefined);
      mocks.mockAddChunks.mockResolvedValue(undefined);

      const result = await ragPipeline.syncFolder('folder-1');

      expect(result).toBe(2);
      expect(mocks.mockGetFolder).toHaveBeenCalledWith('folder-1');
      expect(mocks.mockListDocumentsInFolder).toHaveBeenCalledWith('abc123');
      expect(mocks.mockGetDocument).toHaveBeenCalledTimes(2);
      expect(mocks.mockUpdateLastSync).toHaveBeenCalledWith('folder-1', 2);
    });

    it('should throw error if folder not found', async () => {
      mocks.mockGetFolder.mockReturnValue(null);

      await expect(ragPipeline.syncFolder('nonexistent')).rejects.toThrow('Folder not found: nonexistent');
    });

    it('should continue syncing other docs if one fails', async () => {
      mocks.mockGetFolder.mockReturnValue(mockFolder);
      mocks.mockListDocumentsInFolder.mockResolvedValue([
        { documentId: 'doc-1', title: 'Doc 1' },
        { documentId: 'doc-2', title: 'Doc 2' },
      ]);
      mocks.mockGetDocument
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockDoc);
      mocks.mockChunkDocument.mockResolvedValue(mockChunks);
      mocks.mockEmbedBatch.mockResolvedValue([mockEmbedding]);
      mocks.mockDeleteChunksByDocId.mockResolvedValue(undefined);
      mocks.mockAddChunks.mockResolvedValue(undefined);

      const result = await ragPipeline.syncFolder('folder-1');

      expect(result).toBe(1);
    });
  });

  describe('TC-5.6-002: Single document sync', () => {
    it('should sync a single document', async () => {
      mocks.mockGetDocument.mockResolvedValue(mockDoc);
      mocks.mockChunkDocument.mockResolvedValue(mockChunks);
      mocks.mockEmbedBatch.mockResolvedValue([mockEmbedding]);
      mocks.mockDeleteChunksByDocId.mockResolvedValue(undefined);
      mocks.mockAddChunks.mockResolvedValue(undefined);

      await ragPipeline.syncDocument('doc-1', 'Test Doc', 'folder-1');

      expect(mocks.mockDeleteChunksByDocId).toHaveBeenCalledWith('doc-1');
      expect(mocks.mockChunkDocument).toHaveBeenCalledWith(mockDoc.content, {
        documentId: 'doc-1',
        title: 'Test Document',
        url: 'https://xxx.feishu.cn/docx/doc-1',
      });
      expect(mocks.mockEmbedBatch).toHaveBeenCalledWith([mockChunks[0].text]);
      expect(mocks.mockAddChunks).toHaveBeenCalled();
    });

    it('should skip empty chunks', async () => {
      mocks.mockGetDocument.mockResolvedValue(mockDoc);
      mocks.mockChunkDocument.mockResolvedValue([]);
      mocks.mockDeleteChunksByDocId.mockResolvedValue(undefined);

      await ragPipeline.syncDocument('doc-1', 'Test Doc', 'folder-1');

      expect(mocks.mockEmbedBatch).not.toHaveBeenCalled();
      expect(mocks.mockAddChunks).not.toHaveBeenCalled();
    });

    it('should use provided title when doc.title is empty', async () => {
      mocks.mockGetDocument.mockResolvedValue({ ...mockDoc, title: '' });
      mocks.mockChunkDocument.mockResolvedValue(mockChunks);
      mocks.mockEmbedBatch.mockResolvedValue([mockEmbedding]);
      mocks.mockDeleteChunksByDocId.mockResolvedValue(undefined);
      mocks.mockAddChunks.mockResolvedValue(undefined);

      await ragPipeline.syncDocument('doc-1', 'Fallback Title', 'folder-1');

      // Implementation uses docTitle = doc.title || title, so empty doc.title falls back to provided title
      expect(mocks.mockChunkDocument).toHaveBeenCalledWith(mockDoc.content, {
        documentId: 'doc-1',
        title: 'Fallback Title',
        url: 'https://xxx.feishu.cn/docx/doc-1',
      });
    });
  });

  describe('TC-5.6-003: Semantic retrieval', () => {
    it('should retrieve relevant document chunks', async () => {
      const searchResults = [
        {
          id: 1,
          docId: 'doc-1',
          docTitle: 'Test Doc',
          docUrl: 'https://xxx.feishu.cn/docx/doc-1',
          folderId: 'folder-1',
          textChunk: 'Relevant content about AI',
          tokenCount: 10,
          docUpdatedAt: 1234567890,
          chunkIndex: 0,
          createdAt: 1234567890,
        },
      ];
      mocks.mockEmbed.mockResolvedValue([0.1, 0.2, 0.3]);
      mocks.mockSearchChunks.mockResolvedValue(searchResults);

      const result = await ragPipeline.retrieve('AI query');

      expect(mocks.mockEmbed).toHaveBeenCalledWith('AI query');
      expect(mocks.mockSearchChunks).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5);
      expect(result).toContain('[来源: Test Doc]');
      expect(result).toContain('Relevant content about AI');
    });

    it('should return empty string when no results', async () => {
      mocks.mockEmbed.mockResolvedValue([0.1, 0.2, 0.3]);
      mocks.mockSearchChunks.mockResolvedValue([]);

      const result = await ragPipeline.retrieve('nonexistent query');

      expect(result).toBe('');
    });

    it('should respect topK parameter', async () => {
      mocks.mockEmbed.mockResolvedValue([0.1, 0.2, 0.3]);
      mocks.mockSearchChunks.mockResolvedValue([]);

      await ragPipeline.retrieve('test query', 10);

      expect(mocks.mockSearchChunks).toHaveBeenCalledWith([0.1, 0.2, 0.3], 10);
    });

    it('should format results with citations and separator between multiple results', async () => {
      const searchResults = [
        {
          id: 1,
          docId: 'doc-1',
          docTitle: 'First Doc',
          docUrl: 'https://xxx.feishu.cn/docx/doc-1',
          folderId: 'folder-1',
          textChunk: 'First content',
          tokenCount: 5,
          docUpdatedAt: 1234567890,
          chunkIndex: 0,
          createdAt: 1234567890,
        },
        {
          id: 2,
          docId: 'doc-2',
          docTitle: 'Second Doc',
          docUrl: 'https://xxx.feishu.cn/docx/doc-2',
          folderId: 'folder-1',
          textChunk: 'Second content',
          tokenCount: 5,
          docUpdatedAt: 1234567890,
          chunkIndex: 0,
          createdAt: 1234567890,
        },
      ];
      mocks.mockEmbed.mockResolvedValue([0.1, 0.2, 0.3]);
      mocks.mockSearchChunks.mockResolvedValue(searchResults);

      const result = await ragPipeline.retrieve('test');

      expect(result).toContain('[来源: First Doc](https://xxx.feishu.cn/docx/doc-1)');
      expect(result).toContain('First content');
      // Separator is \n\n---\n\n between results
      expect(result).toContain('\n\n---\n\n');
    });
  });

  describe('getStats', () => {
    it('should return total chunk count', async () => {
      mocks.mockGetChunkCount.mockResolvedValue(42);

      const stats = await ragPipeline.getStats();

      expect(stats).toEqual({ totalChunks: 42 });
    });
  });
});
