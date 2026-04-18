/**
 * AI_Feishu Knowledge Base Folder Manager
 *
 * Manages KB folders with additional sync logic on top of config-store.
 */
import { KBFolder } from '../types/config';
export declare class KBFolderManager {
    /**
     * Add a new KB folder
     * Extracts folderToken from URL and validates
     */
    addFolder(name: string, url: string): KBFolder;
    /**
     * Remove a KB folder by ID
     */
    removeFolder(folderId: string): void;
    /**
     * Get a single folder by ID
     */
    getFolder(folderId: string): KBFolder | null;
    /**
     * Get all folders
     */
    getAllFolders(): KBFolder[];
    /**
     * Get only enabled folders
     */
    getEnabledFolders(): KBFolder[];
    /**
     * Update last sync timestamp and doc count
     */
    updateLastSync(folderId: string, docCount: number): void;
    /**
     * Enable or disable sync for a folder
     */
    setSyncEnabled(folderId: string, enabled: boolean): void;
    /**
     * Check if a folder needs sync based on interval
     */
    needsSync(folder: KBFolder): boolean;
    /**
     * Get folders that need sync
     */
    getFoldersNeedingSync(): KBFolder[];
    /**
     * Parse folder token from Feishu folder URL
     * URL format: https://xxx.feishu.cn/drive/folder/xxxxx
     */
    parseFolderToken(url: string): string | null;
}
export {};
//# sourceMappingURL=kb-folder-manager.d.ts.map