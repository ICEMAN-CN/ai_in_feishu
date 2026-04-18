/**
 * AI_Feishu Knowledge Base Folder Manager
 *
 * Manages KB folders with additional sync logic on top of config-store.
 */
import { v4 as uuidv4 } from 'uuid';
import { getKBFolder, getAllKBFolders, getEnabledKBFolders, saveKBFolder, deleteKBFolder } from './config-store';
import { logger } from './logger';
const KB_SYNC_INTERVAL = parseInt(process.env.KB_SYNC_INTERVAL || '3600', 10);
export class KBFolderManager {
    /**
     * Add a new KB folder
     * Extracts folderToken from URL and validates
     */
    addFolder(name, url) {
        const folderToken = this.parseFolderToken(url);
        if (!folderToken) {
            throw new Error('Invalid folder URL: could not extract folder token');
        }
        const now = new Date().toISOString();
        const folder = {
            id: uuidv4(),
            name,
            url,
            folderToken,
            lastSyncAt: undefined,
            lastSyncDocCount: 0,
            syncEnabled: true,
            createdAt: now,
        };
        saveKBFolder(folder);
        logger.info('KBFolderManager', `Added folder: ${name} (${folder.id})`);
        return folder;
    }
    /**
     * Remove a KB folder by ID
     */
    removeFolder(folderId) {
        const folder = getKBFolder(folderId);
        if (!folder) {
            throw new Error(`Folder not found: ${folderId}`);
        }
        deleteKBFolder(folderId);
        logger.info('KBFolderManager', `Removed folder: ${folder.name} (${folderId})`);
    }
    /**
     * Get a single folder by ID
     */
    getFolder(folderId) {
        return getKBFolder(folderId);
    }
    /**
     * Get all folders
     */
    getAllFolders() {
        return getAllKBFolders();
    }
    /**
     * Get only enabled folders
     */
    getEnabledFolders() {
        return getEnabledKBFolders();
    }
    /**
     * Update last sync timestamp and doc count
     */
    updateLastSync(folderId, docCount) {
        const folder = getKBFolder(folderId);
        if (!folder) {
            throw new Error(`Folder not found: ${folderId}`);
        }
        const updated = {
            ...folder,
            lastSyncAt: new Date().toISOString(),
            lastSyncDocCount: docCount,
        };
        saveKBFolder(updated);
        logger.debug('KBFolderManager', `Updated sync info for ${folder.name}: ${docCount} docs`);
    }
    /**
     * Enable or disable sync for a folder
     */
    setSyncEnabled(folderId, enabled) {
        const folder = getKBFolder(folderId);
        if (!folder) {
            throw new Error(`Folder not found: ${folderId}`);
        }
        const updated = {
            ...folder,
            syncEnabled: enabled,
        };
        saveKBFolder(updated);
        logger.info('KBFolderManager', `Set syncEnabled=${enabled} for folder: ${folder.name}`);
    }
    /**
     * Check if a folder needs sync based on interval
     */
    needsSync(folder) {
        if (!folder.syncEnabled) {
            return false;
        }
        if (!folder.lastSyncAt) {
            return true;
        }
        const lastSync = new Date(folder.lastSyncAt).getTime();
        const now = Date.now();
        const elapsed = (now - lastSync) / 1000;
        return elapsed >= KB_SYNC_INTERVAL;
    }
    /**
     * Get folders that need sync
     */
    getFoldersNeedingSync() {
        return this.getEnabledFolders().filter(folder => this.needsSync(folder));
    }
    /**
     * Parse folder token from Feishu folder URL
     * URL format: https://xxx.feishu.cn/drive/folder/xxxxx
     */
    parseFolderToken(url) {
        const match = url.match(/\/folder\/([a-zA-Z0-9]+)/);
        return match?.[1] || null;
    }
}
//# sourceMappingURL=kb-folder-manager.js.map