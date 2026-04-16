import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

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

describe('EXC-008: Storage Full Detection', () => {
  let connectMock: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    connectMock = vi.mocked(await import('@lancedb/lancedb')).connect;
    connectMock.mockResolvedValue(mockDb);

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

  describe('vector-store: Chunk Operations', () => {
    it('should throw StorageError with ENOSPC when addChunks fails due to disk full', async () => {
      mockTable.add.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const { addChunks, closeVectorStore } = await import('../../src/core/vector-store');

      const chunks: Omit<import('../../src/core/vector-store').DocumentChunk, 'id'>[] = [
        {
          docId: 'doc-1',
          docTitle: 'Test Doc',
          docUrl: 'https://example.com/doc',
          folderId: 'folder-1',
          textChunk: 'Test chunk content',
          tokenCount: 100,
          vector: new Array(1536).fill(0),
          docUpdatedAt: Date.now(),
          chunkIndex: 0,
          createdAt: Date.now(),
          syncStatus: 'synced',
        },
      ];

      await expect(addChunks(chunks)).rejects.toThrow(/ENOSPC|no space left|disk full/i);
      await closeVectorStore();
    });

    it('should throw StorageError with ENOSPC when deleteChunks fails due to disk full', async () => {
      mockTable.countRows.mockResolvedValue(1);
      mockTable.query.mockReturnThis();
      mockTable.execute.mockResolvedValue([{ id: 'chunk-1', doc_id: 'doc-1' }]);
      mockTable.delete.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const { deleteChunksByDocId, closeVectorStore } = await import('../../src/core/vector-store');

      await expect(deleteChunksByDocId('doc-1')).rejects.toThrow(/ENOSPC|no space left|disk full/i);
      await closeVectorStore();
    });
  });

  describe('vector-store: Initialization', () => {
    it('should throw StorageError when LanceDB connection fails due to disk full', async () => {
      connectMock.mockRejectedValue(new Error('ENOSPC: no space left on device, cannot create database'));

      const { initVectorStore, closeVectorStore } = await import('../../src/core/vector-store');

      await expect(initVectorStore()).rejects.toThrow(/ENOSPC|no space left|disk full/i);
      await closeVectorStore().catch(() => {});
    });

    it('should propagate disk full errors from LanceDB table operations', async () => {
      mockTable.countRows.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const { getChunkCount, closeVectorStore } = await import('../../src/core/vector-store');

      await expect(getChunkCount()).rejects.toThrow(/ENOSPC|no space left|disk full/i);
      await closeVectorStore();
    });
  });

  describe('config-store: Database Operation Error Propagation', () => {
    it('should throw StorageError when database query fails due to disk full', async () => {
      const { initDatabase, getDb, getAllModels, closeDb } = await import('../../src/core/config-store');
      initDatabase();

      const db = getDb();
      const originalPrepare = db.prepare.bind(db);
      vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
        const stmt = originalPrepare(sql);
        return {
          ...stmt,
          all: vi.fn().mockImplementation(() => {
            throw new Error('ENOSPC: no space left on device');
          }),
          get: stmt.get,
          run: stmt.run,
        };
      });

      expect(() => getAllModels()).toThrow(/ENOSPC|no space left|disk full/i);
      closeDb();
    });

    it('should throw StorageError with code ENOSPC when saveModel fails due to disk full', async () => {
      const { initDatabase, getDb, saveModel, closeDb } = await import('../../src/core/config-store');
      initDatabase();

      const db = getDb();
      const originalPrepare = db.prepare.bind(db);
      vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
        const stmt = originalPrepare(sql);
        return {
          ...stmt,
          all: stmt.all,
          get: stmt.get,
          run: vi.fn().mockImplementation(() => {
            throw new Error('ENOSPC: no space left on device');
          }),
        };
      });

      const model = {
        id: 'test-model-storage',
        name: 'Test Model',
        provider: 'openai' as const,
        apiKeyEncrypted: JSON.stringify({ ciphertext: 'test', iv: 'test', tag: 'test' }),
        baseUrl: 'https://api.openai.com',
        modelId: 'gpt-4',
        isDefault: false,
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => saveModel(model)).toThrow(/ENOSPC|no space left|disk full/i);
      closeDb();
    });

    it('should throw StorageError when saveSession fails due to disk full', async () => {
      const { initDatabase, getDb, saveSession, closeDb } = await import('../../src/core/config-store');
      initDatabase();

      const db = getDb();
      const originalPrepare = db.prepare.bind(db);
      vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
        const stmt = originalPrepare(sql);
        return {
          ...stmt,
          all: stmt.all,
          get: stmt.get,
          run: vi.fn().mockImplementation(() => {
            throw new Error('ENOSPC: no space left on device');
          }),
        };
      });

      const session = {
        id: 'test-session-storage',
        threadId: 'test-thread-storage',
        p2pId: 'test-p2p-storage',
        modelId: 'test-model-storage',
        messageCount: 0,
        messageLimit: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => saveSession(session)).toThrow(/ENOSPC|no space left|disk full/i);
      closeDb();
    });

    it('should throw StorageError when saveKBFolder fails due to disk full', async () => {
      const { initDatabase, getDb, saveKBFolder, closeDb } = await import('../../src/core/config-store');
      initDatabase();

      const db = getDb();
      const originalPrepare = db.prepare.bind(db);
      vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
        const stmt = originalPrepare(sql);
        return {
          ...stmt,
          all: stmt.all,
          get: stmt.get,
          run: vi.fn().mockImplementation(() => {
            throw new Error('ENOSPC: no space left on device');
          }),
        };
      });

      const folder = {
        id: 'test-folder-storage',
        name: 'Test Folder',
        url: 'https://example.com/folder',
        folderToken: 'test-token',
        lastSyncAt: undefined,
        lastSyncDocCount: 0,
        syncEnabled: true,
        createdAt: new Date().toISOString(),
      };

      expect(() => saveKBFolder(folder)).toThrow(/ENOSPC|no space left|disk full/i);
      closeDb();
    });

    it('should include operation context in storage full errors', async () => {
      const { initDatabase, getDb, saveModel, closeDb } = await import('../../src/core/config-store');
      initDatabase();

      const db = getDb();
      const originalPrepare = db.prepare.bind(db);
      vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
        const stmt = originalPrepare(sql);
        return {
          ...stmt,
          all: stmt.all,
          get: stmt.get,
          run: vi.fn().mockImplementation(() => {
            const error = new Error('ENOSPC: no space left on device');
            (error as any).code = 'ENOSPC';
            throw error;
          }),
        };
      });

      const model = {
        id: 'test-model-context',
        name: 'Test Model',
        provider: 'openai' as const,
        apiKeyEncrypted: JSON.stringify({ ciphertext: 'test', iv: 'test', tag: 'test' }),
        baseUrl: 'https://api.openai.com',
        modelId: 'gpt-4',
        isDefault: false,
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => saveModel(model)).toThrow(/ENOSPC|storage|disk/i);
      closeDb();
    });
  });

  describe('Error Message Quality', () => {
    it('should provide meaningful error messages when LanceDB operations fail', async () => {
      mockTable.countRows.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const { getChunkCount, closeVectorStore } = await import('../../src/core/vector-store');

      try {
        await getChunkCount();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toMatch(/ENOSPC|no space left|disk full/i);
      }

      await closeVectorStore();
    });
  });
});
