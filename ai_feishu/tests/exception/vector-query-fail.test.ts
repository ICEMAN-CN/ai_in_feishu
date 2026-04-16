import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VectorStoreService } from '../../src/core/vector-store-service';

vi.mock('@lancedb/lancedb', () => ({
  connect: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock('../../src/core/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connectMock: any;

describe('EXC-005: Vector DB Query Failure Fallback', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    connectMock = vi.mocked(await import('@lancedb/lancedb')).connect;
    connectMock.mockResolvedValue(mockDb);

    mockDb.tableNames.mockResolvedValue(['document_chunks']);
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

  describe('Error Handling', () => {
    it('should return empty array when vector search fails (internal fallback)', async () => {
      mockTable.vectorSearch.mockImplementation(() => {
        throw new Error('LanceDB query failed: network error');
      });

      const service = new VectorStoreService();

      const results = await service.search([0.1, 0.2, 0.3], 5);

      expect(results).toEqual([]);
    });

    it('should return empty array when toArray fails after vectorSearch (internal fallback)', async () => {
      mockTable.vectorSearch.mockReturnThis();
      mockTable.limit.mockReturnThis();
      mockTable.toArray.mockImplementation(() => {
        throw new Error('LanceDB connection timeout');
      });

      const service = new VectorStoreService();

      const results = await service.search([0.1, 0.2, 0.3], 5);

      expect(results).toEqual([]);
    });

    it('should throw error when delete fails', async () => {
      mockTable.delete.mockImplementation(() => {
        throw new Error('LanceDB delete failed: permission denied');
      });

      const service = new VectorStoreService();

      await expect(service.deleteByDocId('doc-123')).rejects.toThrow(
        'LanceDB delete failed: permission denied'
      );
    });

    it('should throw error when getStats countRows fails', async () => {
      mockTable.countRows.mockImplementation(() => {
        throw new Error('LanceDB table not found');
      });

      const service = new VectorStoreService();

      await expect(service.getStats()).rejects.toThrow('LanceDB table not found');
    });
  });

  describe('Fallback Behavior', () => {
    it('should return empty array when searchChunks catches error internally', async () => {
      mockTable.vectorSearch.mockImplementation(() => {
        throw new Error('Vector search not configured');
      });

      const { searchChunks, closeVectorStore } = await import('../../src/core/vector-store');

      const results = await searchChunks([0.1, 0.2], 3);

      expect(results).toEqual([]);

      await closeVectorStore();
    });

    it('should return empty array when getChunksByDocId catches error internally', async () => {
      mockTable.query.mockImplementation(() => {
        throw new Error('Query execution failed');
      });

      const { getChunksByDocId, closeVectorStore } = await import('../../src/core/vector-store');

      const results = await getChunksByDocId('doc-123');

      expect(results).toEqual([]);

      await closeVectorStore();
    });

    it('should re-throw error from deleteChunksByDocId', async () => {
      mockTable.delete.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const { deleteChunksByDocId, closeVectorStore } = await import('../../src/core/vector-store');

      await expect(deleteChunksByDocId('doc-123')).rejects.toThrow('Delete failed');

      await closeVectorStore();
    });
  });

  describe('Service Layer Error Propagation', () => {
    it('should return empty array when vector-store search fails (fallback)', async () => {
      mockTable.vectorSearch.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const service = new VectorStoreService();

      const results = await service.search([0.1, 0.2], 5);

      expect(results).toEqual([]);
    });

    it('should propagate addChunks error from vector-store', async () => {
      mockTable.add.mockImplementation(() => {
        throw new Error('Write failed: disk full');
      });

      const service = new VectorStoreService();

      const chunks = [
        {
          docId: 'doc1',
          docTitle: 'Test',
          docUrl: 'https://example.com/doc1',
          folderId: 'folder1',
          textChunk: 'Test chunk',
          tokenCount: 10,
          vector: [0.1, 0.2],
          docUpdatedAt: Date.now(),
          chunkIndex: 0,
          syncStatus: 'pending',
        },
      ];

      await expect(service.addChunks(chunks)).rejects.toThrow('Write failed: disk full');
    });
  });

  describe('Connection Error Handling', () => {
    it('should throw when database connection fails', async () => {
      vi.resetModules();

      const { connect } = await import('@lancedb/lancedb');
      const { getVectorStore, closeVectorStore } = await import('../../src/core/vector-store');

      vi.mocked(connect).mockImplementation(() => {
        throw new Error('Connection refused: database unavailable');
      });

      await expect(getVectorStore()).rejects.toThrow('Connection refused: database unavailable');

      await closeVectorStore();
    });

    it('should throw when opening table fails', async () => {
      mockDb.openTable.mockImplementation(() => {
        throw new Error('Table access denied');
      });

      const { getVectorStore, closeVectorStore } = await import('../../src/core/vector-store');

      await expect(getVectorStore()).rejects.toThrow('Table access denied');

      await closeVectorStore();
    });
  });

  describe('Error Message Verification', () => {
    it('should catch and handle LanceDB errors internally returning empty results', async () => {
      const dbError = new Error('Invalid query: missing index');
      mockTable.vectorSearch.mockImplementation(() => {
        throw dbError;
      });

      const service = new VectorStoreService();

      const results = await service.search([0.1], 5);

      expect(results).toEqual([]);
    });

    it('should preserve original error when delete operations fail', async () => {
      const originalError = new Error('Delete operation failed');
      mockTable.delete.mockImplementation(() => {
        throw originalError;
      });

      const { deleteChunksByDocId, closeVectorStore } = await import('../../src/core/vector-store');

      try {
        await deleteChunksByDocId('doc-123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(originalError);
      }

      await closeVectorStore();
    });

    it('should throw with full error context when addChunks fails', async () => {
      const writeError = new Error('Write failed: disk full');
      mockTable.add.mockImplementation(() => {
        throw writeError;
      });

      const { addChunks, closeVectorStore } = await import('../../src/core/vector-store');

      try {
        await addChunks([
          {
            docId: 'doc1',
            docTitle: 'Test',
            docUrl: 'https://example.com/doc1',
            folderId: 'folder1',
            textChunk: 'Test chunk',
            tokenCount: 10,
            vector: [0.1, 0.2],
            docUpdatedAt: Date.now(),
            chunkIndex: 0,
            createdAt: Date.now(),
            syncStatus: 'pending',
          },
        ]);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(writeError);
        expect((error as Error).message).toBe('Write failed: disk full');
      }

      await closeVectorStore();
    });
  });
});
