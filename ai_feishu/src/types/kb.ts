/**
 * AI_Feishu Knowledge Base Types
 *
 * Additional types for KB management beyond the basic KBFolder.
 */

import type { KBFolder } from './config';

export interface SyncJob {
  id: string;
  folderId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  docCount?: number;
  error?: string;
}

export interface KBSyncStats {
  totalFolders: number;
  enabledFolders: number;
  totalDocuments: number;
  totalChunks: number;
}

export { KBFolder };
