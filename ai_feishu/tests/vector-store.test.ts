import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the entire lancedb module before importing vector-store
vi.mock('@lancedb/lancedb', () => ({
  connect: vi.fn(),
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

// Mock logger to prevent console output during tests
vi.mock('../src/core/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock table and db objects
const mockTable = {
  add: vi.fn(),
  delete: vi.fn(),
  countRows: vi.fn().mockResolvedValue(0),
  vectorSearch: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  toArray: vi.fn().mockResolvedValue([]),
  query: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
};

const mockDb = {
  tableNames: vi.fn().mockResolvedValue([]),
  createTable: vi.fn().mockResolvedValue(mockTable),
  openTable: vi.fn().mockResolvedValue(mockTable),
  close: vi.fn(),
};

// Setup connect mock to return our mockDb
let connectMock: any;
describe('VectorStoreService', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Reset and setup connect mock
    connectMock = vi.mocked(await import('@lancedb/lancedb')).connect;
    connectMock.mockResolvedValue(mockDb);

    // Setup default mock implementations
    mockDb.tableNames.mockResolvedValue([]);
    mockDb.createTable.mockResolvedValue(mockTable);
    mockDb.openTable.mockResolvedValue(mockTable);
    mockTable.add.mockResolvedValue(undefined);
    mockTable.delete.mockResolvedValue(undefined);
    mockTable.countRows.mockResolvedValue(0);
    mockTable.vectorSearch.mockReturnThis();
    mockTable.limit.mockReturnThis();
    mockTable.query.mockReturnThis();
    mockTable.where.mockReturnThis();
    mockTable.execute.mockResolvedValue([]);
    mockTable.toArray.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TC-5.5-001: addChunks writes successfully', () => {
    it('should add chunks to vector store', async () => {
      const { addChunks, closeVectorStore } = await import('../src/core/vector-store');

      const chunks = [
        {
          docId: 'doc1',
          docTitle: 'Test Doc',
          docUrl: 'https://example.com/doc1',
          folderId: 'folder1',
          textChunk: 'Test chunk content',
          tokenCount: 10,
          vector: [0.1, 0.2, 0.3],
          docUpdatedAt: Date.now(),
          chunkIndex: 0,
          createdAt: Date.now(),
          syncStatus: 'pending',
        },
      ];

      await addChunks(chunks);

      expect(mockTable.add).toHaveBeenCalled();
      const addedData = mockTable.add.mock.calls[0][0];
      expect(addedData).toHaveLength(1);
      expect(addedData[0].doc_id).toBe('doc1');
      expect(addedData[0].doc_title).toBe('Test Doc');
      expect(addedData[0].text_chunk).toBe('Test chunk content');

      await closeVectorStore();
    });

    it('should add multiple chunks with correct IDs', async () => {
      mockTable.countRows.mockResolvedValue(5); // Simulate 5 existing chunks

      const { addChunks, closeVectorStore } = await import('../src/core/vector-store');

      const chunks = [
        {
          docId: 'doc2',
          docTitle: 'Multi Chunk Doc',
          docUrl: 'https://example.com/doc2',
          folderId: 'folder1',
          textChunk: 'Chunk 1',
          tokenCount: 5,
          vector: [0.1, 0.2],
          docUpdatedAt: Date.now(),
          chunkIndex: 0,
          createdAt: Date.now(),
          syncStatus: 'pending',
        },
        {
          docId: 'doc2',
          docTitle: 'Multi Chunk Doc',
          docUrl: 'https://example.com/doc2',
          folderId: 'folder1',
          textChunk: 'Chunk 2',
          tokenCount: 5,
          vector: [0.3, 0.4],
          docUpdatedAt: Date.now(),
          chunkIndex: 1,
          createdAt: Date.now(),
          syncStatus: 'pending',
        },
      ];

      await addChunks(chunks);

      expect(mockTable.add).toHaveBeenCalled();
      const addedData = mockTable.add.mock.calls[0][0];
      expect(addedData).toHaveLength(2);
      expect(addedData[0].id).toBe(6); // maxId (5) + 1
      expect(addedData[1].id).toBe(7); // maxId (5) + 2

      await closeVectorStore();
    });

    it('should transform chunk fields to snake_case for storage', async () => {
      const { addChunks, closeVectorStore } = await import('../src/core/vector-store');

      const chunks = [
        {
          docId: 'doc1',
          docTitle: 'Test',
          docUrl: 'http://test.com',
          folderId: 'f1',
          textChunk: 'content',
          tokenCount: 100,
          vector: [0.1],
          docUpdatedAt: 1234567890,
          chunkIndex: 0,
          createdAt: 1234567890,
          syncStatus: 'synced',
        },
      ];

      await addChunks(chunks);

      const addedData = mockTable.add.mock.calls[0][0][0];
      expect(addedData).toHaveProperty('doc_id', 'doc1');
      expect(addedData).toHaveProperty('doc_title', 'Test');
      expect(addedData).toHaveProperty('doc_url', 'http://test.com');
      expect(addedData).toHaveProperty('folder_id', 'f1');
      expect(addedData).toHaveProperty('text_chunk', 'content');
      expect(addedData).toHaveProperty('token_count', 100);
      expect(addedData).toHaveProperty('doc_updated_at', 1234567890);
      expect(addedData).toHaveProperty('chunk_index', 0);
      expect(addedData).toHaveProperty('created_at', 1234567890);
      expect(addedData).toHaveProperty('sync_status', 'synced');

      await closeVectorStore();
    });
  });

  describe('TC-5.5-002: searchChunks returns related results', () => {
    it('should return search results from vector search', async () => {
      const mockSearchResults = [
        {
          id: 1,
          doc_id: 'doc1',
          doc_title: 'Test Doc',
          doc_url: 'https://example.com/doc1',
          folder_id: 'folder1',
          text_chunk: 'Search result content',
          token_count: 10,
          doc_updated_at: 1234567890,
          chunk_index: 0,
          created_at: 1234567890,
          _distance: 0.1,
        },
      ];
      mockTable.toArray.mockResolvedValue(mockSearchResults);

      const { searchChunks, closeVectorStore } = await import('../src/core/vector-store');

      const results = await searchChunks([0.1, 0.2, 0.3], 5);

      expect(mockTable.vectorSearch).toHaveBeenCalledWith([0.1, 0.2, 0.3]);
      expect(mockTable.limit).toHaveBeenCalledWith(5);
      expect(results).toHaveLength(1);
      expect(results[0].docId).toBe('doc1');
      expect(results[0].docTitle).toBe('Test Doc');
      expect(results[0].textChunk).toBe('Search result content');

      await closeVectorStore();
    });

    it('should return empty array when search fails', async () => {
      mockTable.vectorSearch.mockImplementation(() => {
        throw new Error('Vector search not configured');
      });

      const { searchChunks, closeVectorStore } = await import('../src/core/vector-store');

      const results = await searchChunks([0.1, 0.2], 3);

      expect(results).toEqual([]);

      await closeVectorStore();
    });

    it('should transform search results back to camelCase', async () => {
      mockTable.toArray.mockResolvedValue([
        {
          id: 42,
          doc_id: 'my-doc',
          doc_title: 'My Document',
          doc_url: 'https://example.com/my-doc',
          folder_id: 'my-folder',
          text_chunk: 'Some content here',
          token_count: 25,
          doc_updated_at: 9999999999,
          chunk_index: 3,
          created_at: 8888888888,
        },
      ]);

      const { searchChunks, closeVectorStore } = await import('../src/core/vector-store');

      const results = await searchChunks([0.5], 1);

      expect(results[0]).toEqual({
        id: 42,
        docId: 'my-doc',
        docTitle: 'My Document',
        docUrl: 'https://example.com/my-doc',
        folderId: 'my-folder',
        textChunk: 'Some content here',
        tokenCount: 25,
        docUpdatedAt: 9999999999,
        chunkIndex: 3,
        createdAt: 8888888888,
      });

      await closeVectorStore();
    });
  });

  describe('TC-5.5-003: getChunkCount returns correct count', () => {
    it('should return correct chunk count', async () => {
      mockTable.countRows.mockResolvedValue(42);

      const { getChunkCount, closeVectorStore } = await import('../src/core/vector-store');

      const count = await getChunkCount();

      expect(count).toBe(42);
      expect(mockTable.countRows).toHaveBeenCalled();

      await closeVectorStore();
    });

    it('should return zero when table is empty', async () => {
      mockTable.countRows.mockResolvedValue(0);

      const { getChunkCount, closeVectorStore } = await import('../src/core/vector-store');

      const count = await getChunkCount();

      expect(count).toBe(0);

      await closeVectorStore();
    });
  });

  describe('getChunksByDocId', () => {
    it('should query chunks by docId', async () => {
      mockTable.toArray.mockResolvedValue([
        {
          id: 1,
          doc_id: 'doc1',
          doc_title: 'Test',
          doc_url: 'url',
          folder_id: 'folder1',
          text_chunk: 'chunk1',
          token_count: 10,
          doc_updated_at: 1000,
          chunk_index: 0,
          created_at: 1000,
        },
        {
          id: 2,
          doc_id: 'doc1',
          doc_title: 'Test',
          doc_url: 'url',
          folder_id: 'folder1',
          text_chunk: 'chunk2',
          token_count: 10,
          doc_updated_at: 1000,
          chunk_index: 1,
          created_at: 1000,
        },
      ]);

      const { getChunksByDocId, closeVectorStore } = await import('../src/core/vector-store');

      const results = await getChunksByDocId('doc1');

      expect(mockTable.query).toHaveBeenCalled();
      expect(mockTable.where).toHaveBeenCalledWith('doc_id = ?', ['doc1']);
      expect(results).toHaveLength(2);
      expect(results[0].docId).toBe('doc1');
      expect(results[1].chunkIndex).toBe(1);

      await closeVectorStore();
    });

    it('should return empty array when doc not found', async () => {
      mockTable.toArray.mockResolvedValue([]);

      const { getChunksByDocId, closeVectorStore } = await import('../src/core/vector-store');

      const results = await getChunksByDocId('nonexistent');

      expect(results).toEqual([]);

      await closeVectorStore();
    });
  });

  describe('deleteChunksByDocId', () => {
    it('should delete chunks by docId', async () => {
      const { deleteChunksByDocId, closeVectorStore } = await import('../src/core/vector-store');

      await deleteChunksByDocId('doc1');

      expect(mockTable.delete).toHaveBeenCalledWith('doc_id = "doc1"');

      await closeVectorStore();
    });

    it('should throw error when deletion fails', async () => {
      mockTable.delete.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const { deleteChunksByDocId, closeVectorStore } = await import('../src/core/vector-store');

      await expect(deleteChunksByDocId('doc1')).rejects.toThrow('Delete failed');

      await closeVectorStore();
    });
  });

  describe('closeVectorStore', () => {
    it('should close database connection', async () => {
      mockDb.tableNames.mockResolvedValue(['document_chunks']);

      const { closeVectorStore, getVectorStore } = await import('../src/core/vector-store');

      await getVectorStore();
      await closeVectorStore();

      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle multiple close calls gracefully', async () => {
      mockDb.tableNames.mockResolvedValue(['document_chunks']);

      const { closeVectorStore, getVectorStore } = await import('../src/core/vector-store');

      await getVectorStore();
      await closeVectorStore();
      await closeVectorStore(); // Second call should not throw

      expect(mockDb.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('initVectorStore', () => {
    it('should create table if it does not exist', async () => {
      mockDb.tableNames.mockResolvedValue([]); // Table doesn't exist

      const { initVectorStore, closeVectorStore } = await import('../src/core/vector-store');

      await initVectorStore();

      expect(mockDb.createTable).toHaveBeenCalled();
      expect(mockTable.delete).toHaveBeenCalledWith('doc_id = "__placeholder__"');

      await closeVectorStore();
    });

    it('should open existing table if it exists', async () => {
      mockDb.tableNames.mockResolvedValue(['document_chunks']); // Table exists

      const { initVectorStore, closeVectorStore } = await import('../src/core/vector-store');

      await initVectorStore();

      expect(mockDb.openTable).toHaveBeenCalledWith('document_chunks');
      expect(mockDb.createTable).not.toHaveBeenCalled();

      await closeVectorStore();
    });
  });
});
