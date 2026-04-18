import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KBFolderManager } from '../src/core/kb-folder-manager';
import * as configStore from '../src/core/config-store';

vi.mock('../src/core/config-store');

describe('KBFolderManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addFolder', () => {
    it('TC-5.1-001: should add folder with valid URL', () => {
      const manager = new KBFolderManager();
      const folder = manager.addFolder(
        'Test Folder',
        'https://xxx.feishu.cn/drive/folder/abc123'
      );

      expect(folder.name).toBe('Test Folder');
      expect(folder.folderToken).toBe('abc123');
      expect(folder.syncEnabled).toBe(true);
      expect(configStore.saveKBFolder).toHaveBeenCalled();
    });

    it('TC-5.1-002: should throw error for invalid URL', () => {
      const manager = new KBFolderManager();
      expect(() =>
        manager.addFolder('Test', 'https://invalid.com')
      ).toThrow('Invalid folder URL');
    });

    it('should throw error for URL without /folder/ path', () => {
      const manager = new KBFolderManager();
      expect(() =>
        manager.addFolder('Test', 'https://xxx.feishu.cn/docx/abc123')
      ).toThrow('Invalid folder URL');
    });
  });

  describe('removeFolder', () => {
    it('TC-5.1-003: should remove existing folder', () => {
      vi.mocked(configStore.getKBFolder).mockReturnValue({
        id: '123',
        name: 'Test',
        url: 'https://xxx.feishu.cn/drive/folder/abc123',
        folderToken: 'abc123',
        syncEnabled: true,
        lastSyncAt: undefined,
        lastSyncDocCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const manager = new KBFolderManager();
      manager.removeFolder('123');

      expect(configStore.deleteKBFolder).toHaveBeenCalledWith('123');
    });

    it('should throw error when folder not found', () => {
      vi.mocked(configStore.getKBFolder).mockReturnValue(null);

      const manager = new KBFolderManager();
      expect(() => manager.removeFolder('non-existent')).toThrow(
        'Folder not found'
      );
    });
  });

  describe('getAllFolders', () => {
    it('TC-5.1-004: should get all folders', () => {
      vi.mocked(configStore.getAllKBFolders).mockReturnValue([
        {
          id: '1',
          name: 'Folder 1',
          url: 'https://xxx.feishu.cn/drive/folder/abc123',
          folderToken: 'abc123',
          syncEnabled: true,
          lastSyncAt: undefined,
          lastSyncDocCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: 'Folder 2',
          url: 'https://xxx.feishu.cn/drive/folder/def456',
          folderToken: 'def456',
          syncEnabled: true,
          lastSyncAt: undefined,
          lastSyncDocCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]);

      const manager = new KBFolderManager();
      const folders = manager.getAllFolders();

      expect(folders).toHaveLength(2);
    });
  });

  describe('parseFolderToken', () => {
    it('should parse valid folder URL and return token', () => {
      const manager = new KBFolderManager();
      const token = manager.parseFolderToken(
        'https://xxx.feishu.cn/drive/folder/abc123'
      );
      expect(token).toBe('abc123');
    });

    it('should return null for URL without /folder/ path', () => {
      const manager = new KBFolderManager();
      const token = manager.parseFolderToken(
        'https://xxx.feishu.cn/docx/abc123'
      );
      expect(token).toBeNull();
    });

    it('should return null for URL where folder is not a path segment', () => {
      const manager = new KBFolderManager();
      const token = manager.parseFolderToken(
        'https://xxx.feishu.cn/folder-thing/abc123'
      );
      expect(token).toBeNull();
    });

    it('should handle URL with query parameters', () => {
      const manager = new KBFolderManager();
      const token = manager.parseFolderToken(
        'https://xxx.feishu.cn/drive/folder/abc123?from=portal'
      );
      expect(token).toBe('abc123');
    });
  });
});