/**
 * AI_Feishu Vector Store (LanceDB)
 *
 * Provides document chunk storage and semantic search capabilities.
 * Note: This is a simplified implementation for Phase 1 scaffolding.
 * Full vector search with proper embeddings will be implemented in Sprint 5.
 */

import { connect } from '@lancedb/lancedb';
import { existsSync, mkdirSync } from 'fs';

const VECTOR_DB_PATH = process.env.VECTOR_DB_PATH || './data/vectors';
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536');

export interface DocumentChunk {
  id: number;
  docId: string;
  docTitle: string;
  docUrl: string;
  folderId: string;
  textChunk: string;
  tokenCount: number;
  vector: number[];
  docUpdatedAt: number;
  chunkIndex: number;
  createdAt: number;
  syncStatus: string;
}

export interface SearchResult {
  id: number;
  docId: string;
  docTitle: string;
  docUrl: string;
  folderId: string;
  textChunk: string;
  tokenCount: number;
  docUpdatedAt: number;
  chunkIndex: number;
  createdAt: number;
  _distance?: number;
}

interface VectorStoreInstance {
  table: any;
  db: any;
}

let vectorStore: VectorStoreInstance | null = null;

export async function initVectorStore(): Promise<VectorStoreInstance> {
  // Ensure directory exists
  if (!existsSync(VECTOR_DB_PATH)) {
    mkdirSync(VECTOR_DB_PATH, { recursive: true });
    console.log(`[vector-store] Created vector directory: ${VECTOR_DB_PATH}`);
  }

  const db = await connect(VECTOR_DB_PATH);

  // Check if table already exists
  const tableNames = await db.tableNames();
  if (tableNames.includes('document_chunks')) {
    console.log('[vector-store] Table document_chunks already exists');
    const table = await db.openTable('document_chunks');
    vectorStore = { table, db };
    return vectorStore;
  }

  // Create table - using raw SQL for simplicity
  // Schema will be inferred from first data insert
  const table = await db.createTable('document_chunks', []);
  console.log('[vector-store] Created table document_chunks');

  vectorStore = { table, db };
  console.log(`[vector-store] Vector store initialized at: ${VECTOR_DB_PATH}`);
  return vectorStore;
}

export async function getVectorStore(): Promise<VectorStoreInstance> {
  if (!vectorStore) {
    vectorStore = await initVectorStore();
  }
  return vectorStore;
}

export async function addChunks(chunks: Omit<DocumentChunk, 'id'>[]): Promise<void> {
  const store = await getVectorStore();

  // Get current max id
  let maxId = 0;
  try {
    const count = await store.table.countRows();
    if (count > 0) {
      maxId = count;
    }
  } catch {
    // Table might be empty
  }

  // Add IDs to chunks
  const chunksWithIds = chunks.map((chunk, i) => ({
    id: maxId + i + 1,
    doc_id: chunk.docId,
    doc_title: chunk.docTitle,
    doc_url: chunk.docUrl,
    folder_id: chunk.folderId,
    text_chunk: chunk.textChunk,
    token_count: chunk.tokenCount,
    vector: chunk.vector,
    doc_updated_at: chunk.docUpdatedAt,
    chunk_index: chunk.chunkIndex,
    created_at: chunk.createdAt,
    sync_status: chunk.syncStatus,
  }));

  await store.table.add(chunksWithIds);
  console.log(`[vector-store] Added ${chunks.length} chunks`);
}

export async function searchChunks(
  _queryVector: number[],
  topK: number = 5,
  _filterFolderId?: string
): Promise<SearchResult[]> {
  const store = await getVectorStore();

  try {
    // Use vector search with limit
    const results = await store.table
      .vectorSearch(_queryVector)
      .limit(topK)
      .toArray();

    return results.map((row: any) => ({
      id: row.id,
      docId: row.doc_id,
      docTitle: row.doc_title,
      docUrl: row.doc_url,
      folderId: row.folder_id,
      textChunk: row.text_chunk,
      tokenCount: row.token_count,
      docUpdatedAt: Number(row.doc_updated_at),
      chunkIndex: row.chunk_index,
      createdAt: Number(row.created_at),
    }));
  } catch (error) {
    console.warn('[vector-store] Vector search not yet fully configured:', error);
    return [];
  }
}

export async function getChunksByDocId(docId: string): Promise<SearchResult[]> {
  const store = await getVectorStore();
  try {
    const results = await store.table
      .query()
      .where('doc_id = ?', [docId])
      .toArray();

    return results.map((row: any) => ({
      id: row.id,
      docId: row.doc_id,
      docTitle: row.doc_title,
      docUrl: row.doc_url,
      folderId: row.folder_id,
      textChunk: row.text_chunk,
      tokenCount: row.token_count,
      docUpdatedAt: Number(row.doc_updated_at),
      chunkIndex: row.chunk_index,
      createdAt: Number(row.created_at),
    }));
  } catch (error) {
    console.warn('[vector-store] Query failed:', error);
    return [];
  }
}

export async function deleteChunksByDocId(_docId: string): Promise<void> {
  // Note: Full implementation will be done when LanceDB API is stabilized
  console.warn('[vector-store] deleteChunksByDocId - pending full implementation');
}

export async function getChunkCount(): Promise<number> {
  const store = await getVectorStore();
  return await store.table.countRows();
}

export async function closeVectorStore(): Promise<void> {
  if (vectorStore?.db) {
    await vectorStore.db.close();
    vectorStore = null;
  }
}

export {};
