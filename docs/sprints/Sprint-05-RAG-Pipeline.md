# Sprint 5: RAG Pipeline

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint周期**: 1.5周  
**前置依赖**: Sprint 1 基础设施, Sprint 4 MCP集成  
**Sprint目标**: 完成文档同步、分块、向量化、检索  

---

## 1. 模块划分

### 模块 5.1: 知识库文件夹管理
### 模块 5.2: 文档拉取服务
### 模块 5.3: 文档分块服务
### 模块 5.4: Embedding服务
### 模块 5.5: LanceDB向量存储
### 模块 5.6: 语义检索服务

---

## 2. 模块详细规格

### 模块 5.1: 知识库文件夹管理

**文件路径**: `src/core/kb-folder-manager.ts`, `src/types/kb.ts`

#### 2.1.1 类型定义

```typescript
export interface KBFolder {
  id: string;
  name: string;
  url: string;
  folderToken: string;
  lastSyncAt?: string;
  lastSyncDocCount: number;
  syncEnabled: boolean;
  createdAt: string;
}

export interface SyncJob {
  id: string;
  folderId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  docCount?: number;
  error?: string;
}
```

#### 2.1.2 文件夹管理器

```typescript
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '@larksuiteoapi/node-sdk';

const KB_SYNC_INTERVAL = parseInt(process.env.KB_SYNC_INTERVAL || '3600');

export class KBFolderManager {
  constructor(
    private db: Database,
    private feishuClient: Client
  ) {}

  addFolder(name: string, url: string): KBFolder {
    // 从URL解析folderToken
    const folderToken = this.parseFolderToken(url);
    if (!folderToken) {
      throw new Error('Invalid folder URL');
    }

    const folder: KBFolder = {
      id: uuidv4(),
      name,
      url,
      folderToken,
      lastSyncDocCount: 0,
      syncEnabled: true,
      createdAt: new Date().toISOString(),
    };

    this.db.prepare(`
      INSERT INTO kb_folders (id, name, url, folder_token, last_sync_doc_count, sync_enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      folder.id,
      folder.name,
      folder.url,
      folder.folderToken,
      folder.lastSyncDocCount,
      folder.syncEnabled ? 1 : 0,
      folder.createdAt
    );

    return folder;
  }

  removeFolder(folderId: string): void {
    this.db.prepare('DELETE FROM kb_folders WHERE id = ?').run(folderId);
  }

  getFolder(folderId: string): KBFolder | null {
    const row = this.db.prepare('SELECT * FROM kb_folders WHERE id = ?').get(folderId) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      url: row.url,
      folderToken: row.folder_token,
      lastSyncAt: row.last_sync_at,
      lastSyncDocCount: row.last_sync_doc_count,
      syncEnabled: row.sync_enabled === 1,
      createdAt: row.created_at,
    };
  }

  getAllFolders(): KBFolder[] {
    const rows = this.db.prepare('SELECT * FROM kb_folders ORDER BY created_at').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      url: row.url,
      folderToken: row.folder_token,
      lastSyncAt: row.last_sync_at,
      lastSyncDocCount: row.last_sync_doc_count,
      syncEnabled: row.sync_enabled === 1,
      createdAt: row.created_at,
    }));
  }

  updateLastSync(folderId: string, docCount: number): void {
    this.db.prepare(`
      UPDATE kb_folders 
      SET last_sync_at = ?, last_sync_doc_count = ?
      WHERE id = ?
    `).run(new Date().toISOString(), docCount, folderId);
  }

  setSyncEnabled(folderId: string, enabled: boolean): void {
    this.db.prepare(`
      UPDATE kb_folders SET sync_enabled = ? WHERE id = ?
    `).run(enabled ? 1 : 0, folderId);
  }

  private parseFolderToken(url: string): string | null {
    // https://xxx.feishu.cn/drive/folder/xxxxx
    const match = url.match(/\/folder\/([a-zA-Z0-9]+)/);
    return match?.[1] || null;
  }
}
```

#### 2.1.3 Admin API

```typescript
// 添加到 src/routers/admin-kb.ts

import { Hono } from 'hono';
import { KBFolderManager } from '../core/kb-folder-manager';

const kbRouter = new Hono();
let folderManager: KBFolderManager;

export function initKBRouter(fm: KBFolderManager) {
  folderManager = fm;
}

kbRouter.get('/folders', async (c) => {
  const folders = folderManager.getAllFolders();
  return c.json({ folders });
});

kbRouter.post('/folders', async (c) => {
  const body = await c.req.json();
  const { name, url } = body;

  if (!name || !url) {
    return c.json({ success: false, message: 'name and url required' }, 400);
  }

  try {
    const folder = folderManager.addFolder(name, url);
    return c.json({ id: folder.id, success: true }, 201);
  } catch (error) {
    return c.json({ success: false, message: (error as Error).message }, 400);
  }
});

kbRouter.delete('/folders/:id', async (c) => {
  const id = c.req.param('id');
  folderManager.removeFolder(id);
  return c.json({ success: true });
});

export default kbRouter;
```

#### 2.1.4 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 添加文件夹 | 能添加文件夹并解析token | 单元测试 |
| URL解析 | 正确从URL提取folderToken | 边界测试 |
| 删除文件夹 | 能删除已添加的文件夹 | 单元测试 |
| 列表查询 | 返回所有文件夹 | curl测试 |

#### 2.1.5 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-5.1-001 | 添加有效URL | 创建文件夹成功 | 单元测试 |
| TC-5.1-002 | 添加无效URL | 抛出Error | 边界测试 |
| TC-5.1-003 | 删除文件夹 | 删除成功 | 单元测试 |
| TC-5.1-004 | 获取所有文件夹 | 返回文件夹数组 | curl测试 |

#### 2.1.6 实现状态

| 项目 | 值 |
|------|-----|
| 状态 | ✅ 完成 |
| Commit | `905f6ce` |
| 实现文件 | `src/core/kb-folder-manager.ts`, `src/routers/admin-kb.ts`, `src/types/kb.ts` |
| 测试文件 | `tests/kb-folder-manager.test.ts` |
| 测试用例 | TC-5.1-001 ~ TC-5.1-004 (4个) + parseFolderToken边界测试 (4个) = 10个 |
| API 端点 | `GET/POST/DELETE /api/admin/kb/folders` |

---

### 模块 5.2: 文档拉取服务

**文件路径**: `src/services/feishu-doc.ts`

#### 2.2.1 文档拉取实现

```typescript
import { Client } from '@larksuiteoapi/node-sdk';

export interface FeishuDocument {
  documentId: string;
  title: string;
  content: string;
  updatedAt: string;
}

export class FeishuDocService {
  constructor(private client: Client) {}

  // 获取文件夹下的文档列表
  async listDocumentsInFolder(folderToken: string): Promise<Array<{ documentId: string; title: string }>> {
    try {
      const response = await this.client.drive.v1.folder.getChildren({
        path: { folder_token: folderToken },
      });

      const items = response.data.items || [];
      return items
        .filter((item: any) => item.token && item.title)
        .map((item: any) => ({
          documentId: item.token,
          title: item.title,
        }));
    } catch (error) {
      console.error('[FeishuDoc] listDocumentsInFolder failed:', error);
      throw error;
    }
  }

  // 获取单个文档内容
  async getDocument(documentId: string): Promise<FeishuDocument> {
    try {
      // 获取文档元数据
      const metaResponse = await this.client.docx.v1.document.get({
        path: { document_id: documentId },
      });

      const title = metaResponse.data?.document?.title || 'Untitled';

      // 获取文档内容
      const contentResponse = await this.client.docx.v1.document.rawContent.get({
        path: { document_id: documentId },
      });

      // 解析内容块
      const content = this.parseContentBlocks(contentResponse.data);

      return {
        documentId,
        title,
        content,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[FeishuDoc] getDocument failed:', error);
      throw error;
    }
  }

  // 解析飞书文档块为纯文本
  private parseContentBlocks(blocks: any[]): string {
    if (!blocks || !Array.isArray(blocks)) {
      return '';
    }

    const texts: string[] = [];

    for (const block of blocks) {
      const text = this.extractTextFromBlock(block);
      if (text) {
        texts.push(text);
      }
    }

    return texts.join('\n\n');
  }

  private extractTextFromBlock(block: any): string {
    if (!block) return '';

    // 处理文本块
    if (block.text?.elements) {
      return block.text.elements
        .map((el: any) => el.text_run?.content || '')
        .join('');
    }

    // 处理标题块
    if (block.heading1?.elements || block.heading2?.elements || block.heading3?.elements) {
      const heading = block.heading1 || block.heading2 || block.heading3;
      return heading.elements
        .map((el: any) => el.text_run?.content || '')
        .join('');
    }

    // 处理列表块
    if (block.list?.elements) {
      return block.list.elements
        .map((el: any) => el.text_run?.content || '')
        .join('');
    }

    return '';
  }
}
```

#### 2.2.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 列表获取 | 能获取文件夹下文档列表 | mock测试 |
| 文档获取 | 能获取单个文档内容和标题 | mock测试 |
| 内容解析 | 正确解析文档块为文本 | 单元测试 |

#### 2.2.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-5.2-001 | 列表获取 | 返回文档数组 | mock测试 |
| TC-5.2-002 | 文档获取 | 返回内容和标题 | mock测试 |
| TC-5.2-003 | 空内容块 | 返回空字符串 | 边界测试 |

#### 2.2.4 实现状态

| 项目 | 值 |
|------|-----|
| 状态 | ✅ 完成 |
| Commit | `07232d9` |
| 实现文件 | `src/services/feishu-doc.ts` |
| 测试文件 | `tests/feishu-doc.test.ts` |
| 测试用例 | TC-5.2-001 ~ TC-5.2-003 (3个) + 边界测试 (11个) = 14个 |

---

### 模块 5.3: 文档分块服务

**文件路径**: `src/services/chunking.ts`

#### 2.3.1 分块实现

```typescript
import { TextSplitter } from '@langchain/core/text_splitters';

const KB_CHUNK_SIZE = parseInt(process.env.KB_CHUNK_SIZE || '500');
const KB_CHUNK_OVERLAP = parseInt(process.env.KB_CHUNK_OVERLAP || '50');

export interface TextChunk {
  text: string;
  tokenCount: number;
  chunkIndex: number;
}

export class ChunkingService {
  private textSplitter: TextSplitter;

  constructor() {
    this.textSplitter = new TextSplitter({
      chunkSize: KB_CHUNK_SIZE,
      chunkOverlap: KB_CHUNK_OVERLAP,
      separators: ['\n\n', '\n', '。', '！', '？', '.', '!', '?', ' ', ''],
    });
  }

  async chunkDocument(text: string, metadata: { documentId: string; title: string; url: string }): Promise<TextChunk[]> {
    // 分割文档
    const splits = await this.textSplitter.splitText(text);

    // 过滤空块
    const nonEmptySplits = splits.filter(s => s.trim().length > 0);

    // 过滤过短块（小于100字符）
    const validSplits = nonEmptySplits.filter(s => s.length >= 100);

    // 构建chunks
    const chunks: TextChunk[] = validSplits.map((split, index) => ({
      text: split,
      tokenCount: this.estimateTokens(split),
      chunkIndex: index,
    }));

    return chunks;
  }

  private estimateTokens(text: string): number {
    // 简单估算
    let tokens = 0;
    for (const char of text) {
      if (char.charCodeAt(0) > 127) {
        tokens += 0.5;  // 中文
      } else {
        tokens += 0.25;  // 英文/符号
      }
    }
    return Math.ceil(tokens);
  }
}
```

#### 2.3.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 分块大小 | 每块token数不超过配置 | 单元测试 |
| 分块重叠 | 块之间有重叠 | 单元测试 |
| 过短过滤 | 过滤100字符以下的块 | 单元测试 |

#### 2.3.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-5.3-001 | 正常分块 | 返回chunks数组 | 单元测试 |
| TC-5.3-002 | 空文本 | 返回空数组 | 边界测试 |
| TC-5.3-003 | 短文本 | 过滤返回空 | 边界测试 |

#### 2.3.4 实现状态

| 项目 | 值 |
|------|-----|
| 状态 | ✅ 完成 |
| Commit | `d1aeb32` |
| 实现文件 | `src/services/chunking.ts` |
| 测试文件 | `tests/chunking.test.ts` |
| 测试用例 | TC-5.3-001 ~ TC-5.3-003 (3个) + 边界测试 (18个) = 21个 |

---

### 模块 5.4: Embedding服务

**文件路径**: `src/services/embedding.ts`

#### 2.4.1 Embedding实现

```typescript
import { createEmbedding } from '@ai-sdk/sdk';

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'openai';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536');

export class EmbeddingService {
  private embeddingModel: any;

  constructor() {
    this.initEmbeddingModel();
  }

  private initEmbeddingModel(): void {
    const apiKey = this.getEmbeddingApiKey();
    const baseUrl = this.getEmbeddingBaseUrl();

    switch (EMBEDDING_PROVIDER) {
      case 'openai':
        const { openai } = require('@ai-sdk/openai');
        const openaiProvider = openai({ apiKey, baseURL: baseUrl });
        this.embeddingModel = openaiProvider.embedding(EMBEDDING_MODEL);
        break;

      case 'ollama':
        const { ollama } = require('@ai-sdk/ollama');
        const ollamaProvider = ollama({ baseURL: baseUrl });
        this.embeddingModel = ollamaProvider.embedding(EMBEDDING_MODEL);
        break;

      default:
        throw new Error(`Unsupported embedding provider: ${EMBEDDING_PROVIDER}`);
    }
  }

  private getEmbeddingApiKey(): string {
    switch (EMBEDDING_PROVIDER) {
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'ollama':
        return '';  // Ollama不需要API Key
      default:
        return '';
    }
  }

  private getEmbeddingBaseUrl(): string {
    switch (EMBEDDING_PROVIDER) {
      case 'openai':
        return process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      case 'ollama':
        return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      default:
        return '';
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await createEmbedding({
        model: this.embeddingModel,
        value: text,
      });

      return response.embedding;
    } catch (error) {
      console.error('[Embedding] embed failed:', error);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  getDimension(): number {
    return EMBEDDING_DIMENSION;
  }
}
```

#### 2.4.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 单文本嵌入 | 返回正确维度的向量 | 单元测试 |
| 批量嵌入 | 批量返回向量数组 | 单元测试 |
| 维度正确 | 向量维度为1536 | 单元测试 |

#### 2.4.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-5.4-001 | 单文本嵌入 | 返回number[] | mock测试 |
| TC-5.4-002 | 批量嵌入 | 返回number[][] | mock测试 |
| TC-5.4-003 | 维度检查 | 维度=1536 | 单元测试 |

#### 2.4.4 实现状态

| 项目 | 值 |
|------|-----|
| 状态 | ✅ 完成 |
| Commit | `08ece46` |
| 实现文件 | `src/services/embedding.ts` |
| 测试文件 | `tests/embedding.test.ts` |
| 测试用例 | TC-5.4-001 ~ TC-5.4-003 (3个) + 边界测试 = 9个 |

---

### 模块 5.5: LanceDB向量存储

**文件路径**: `src/core/vector-store.ts`

#### 2.5.1 向量存储实现

```typescript
import { Table } from 'vectordb';
import { v4 as uuidv4 } from 'uuid';

export interface VectorChunk {
  docId: string;
  docTitle: string;
  docUrl: string;
  folderId: string;
  textChunk: string;
  tokenCount: number;
  vector: number[];
  docUpdatedAt: number;
  chunkIndex: number;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export class VectorStoreService {
  constructor(private table: Table) {}

  async addChunks(chunks: VectorChunk[]): Promise<void> {
    const rows = chunks.map((chunk, index) => ({
      id: index + 1,  // 自增ID
      doc_id: chunk.docId,
      doc_title: chunk.docTitle,
      doc_url: chunk.docUrl,
      folder_id: chunk.folderId,
      text_chunk: chunk.textChunk,
      token_count: chunk.tokenCount,
      vector: chunk.vector,
      doc_updated_at: chunk.docUpdatedAt,
      chunk_index: chunk.chunkIndex,
      created_at: Date.now(),
      sync_status: chunk.syncStatus,
    }));

    await this.table.add(rows);
  }

  async search(
    queryVector: number[],
    topK: number = 5,
    filter?: { folderId?: string }
  ): Promise<VectorChunk[]> {
    let results;

    if (filter?.folderId) {
      results = await this.table
        .search('vector', queryVector)
        .where(`folder_id = "${filter.folderId}"`)
        .limit(topK)
        .execute();
    } else {
      results = await this.table
        .search('vector', queryVector)
        .limit(topK)
        .execute();
    }

    return results.map((row: any) => ({
      docId: row.doc_id,
      docTitle: row.doc_title,
      docUrl: row.doc_url,
      folderId: row.folder_id,
      textChunk: row.text_chunk,
      tokenCount: row.token_count,
      vector: row.vector,
      docUpdatedAt: row.doc_updated_at,
      chunkIndex: row.chunk_index,
      syncStatus: row.sync_status,
    }));
  }

  async deleteByDocId(docId: string): Promise<void> {
    await this.table.delete(`doc_id = "${docId}"`);
  }

  async getStats(): Promise<{ totalChunks: number; totalDocuments: number }> {
    const all = await this.table.query().execute();
    const chunks = all.length;
    const docIds = new Set(all.map((r: any) => r.doc_id));

    return {
      totalChunks: chunks,
      totalDocuments: docIds.size,
    };
  }
}
```

#### 2.5.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 添加chunks | 成功写入向量数据 | 单元测试 |
| 语义检索 | 返回相关文档片段 | 集成测试 |
| 统计查询 | 返回正确统计数据 | 单元测试 |

#### 2.5.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-5.5-001 | 添加chunks | 写入成功 | 单元测试 |
| TC-5.5-002 | 检索 | 返回相关结果 | 集成测试 |
| TC-5.5-003 | 统计 | 返回正确数量 | 单元测试 |

#### 2.5.4 实现状态

| 项目 | 值 |
|------|-----|
| 状态 | ✅ 完成 |
| Commit | `` |
| 实现文件 | `src/core/vector-store.ts` |
| 测试文件 | `tests/vector-store.test.ts` |
| 测试用例 | TC-5.5-001 ~ TC-5.5-003 (3个) + 边界测试 = 15个 |

---

### 模块 5.6: 语义检索服务

**文件路径**: `src/services/rag-pipeline.ts`

#### 2.6.1 RAG Pipeline实现

```typescript
import { KBFolderManager } from '../core/kb-folder-manager';
import { FeishuDocService } from './feishu-doc';
import { ChunkingService } from './chunking';
import { EmbeddingService } from './embedding';
import { VectorStoreService } from '../core/vector-store';

const MAX_RETRIEVAL_CHUNKS = parseInt(process.env.MAX_RETRIEVAL_CHUNKS || '5');

export class RAGPipeline {
  constructor(
    private folderManager: KBFolderManager,
    private docService: FeishuDocService,
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService,
    private vectorStore: VectorStoreService
  ) {}

  // 同步单个文件夹
  async syncFolder(folderId: string): Promise<number> {
    const folder = this.folderManager.getFolder(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // 获取文件夹下所有文档
    const documents = await this.docService.listDocumentsInFolder(folder.folderToken);
    let syncedCount = 0;

    for (const doc of documents) {
      try {
        await this.syncDocument(doc.documentId, doc.title, folder.id);
        syncedCount++;
      } catch (error) {
        console.error(`[RAG] Failed to sync document ${doc.documentId}:`, error);
      }
    }

    // 更新文件夹同步状态
    this.folderManager.updateLastSync(folderId, syncedCount);

    return syncedCount;
  }

  // 同步单个文档
  async syncDocument(documentId: string, title: string, folderId: string): Promise<void> {
    // 获取文档内容
    const doc = await this.docService.getDocument(documentId);

    // 删除旧版本
    await this.vectorStore.deleteByDocId(documentId);

    // 分块
    const chunks = await this.chunkingService.chunkDocument(doc.content, {
      documentId,
      title: doc.title || title,
      url: `https://xxx.feishu.cn/docx/${documentId}`,
    });

    if (chunks.length === 0) {
      return;
    }

    // 批量嵌入
    const texts = chunks.map(c => c.text);
    const embeddings = await this.embeddingService.embedBatch(texts);

    // 写入向量库
    const vectorChunks = chunks.map((chunk, index) => ({
      docId: documentId,
      docTitle: doc.title || title,
      docUrl: `https://xxx.feishu.cn/docx/${documentId}`,
      folderId,
      textChunk: chunk.text,
      tokenCount: chunk.tokenCount,
      vector: embeddings[index],
      docUpdatedAt: Date.now(),
      chunkIndex: chunk.chunkIndex,
      syncStatus: 'synced' as const,
    }));

    await this.vectorStore.addChunks(vectorChunks);
  }

  // 检索
  async retrieve(query: string, topK: number = MAX_RETRIEVAL_CHUNKS): Promise<string> {
    // 生成query向量
    const queryVector = await this.embeddingService.embed(query);

    // 检索
    const results = await this.vectorStore.search(queryVector, topK);

    if (results.length === 0) {
      return '';
    }

    // 格式化结果
    return results.map(r => 
      `[来源: ${r.docTitle}](${r.docUrl})\n${r.textChunk}`
    ).join('\n\n---\n\n');
  }
}
```

#### 2.6.2 Admin API

```typescript
// 添加到 src/routers/admin-kb.ts

kbRouter.post('/sync', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const folderId = body.folderId;

  try {
    if (folderId) {
      await ragPipeline.syncFolder(folderId);
    } else {
      // 全量同步
      const folders = folderManager.getAllFolders();
      for (const folder of folders) {
        if (folder.syncEnabled) {
          await ragPipeline.syncFolder(folder.id);
        }
      }
    }

    return c.json({ success: true, message: 'Sync started' });
  } catch (error) {
    return c.json({ success: false, message: (error as Error).message }, 500);
  }
});

kbRouter.get('/stats', async (c) => {
  const stats = await vectorStore.getStats();
  return c.json(stats);
});
```

#### 2.6.3 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 文件夹同步 | 同步成功，文档入库 | 手动测试 |
| 增量同步 | 仅同步新增/修改的文档 | 版本对比 |
| 语义检索 | 返回相关文档片段 | 集成测试 |
| 统计查询 | 返回正确数量 | curl测试 |

#### 2.6.4 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-5.6-001 | 单文件夹同步 | 文档入库 | 手动测试 |
| TC-5.6-002 | 全量同步 | 所有文件夹同步 | 手动测试 |
| TC-5.6-003 | 检索 | 返回相关结果 | 集成测试 |

---

## 3. 开发流程

### Phase 1: 模块实现

每个模块完成后进行 **Commit 1**:

```bash
git add .
git commit -m "Sprint 5: 完成 [模块名称] 模块

- 实现功能点A
- 实现功能点B

Co-Authored-By: AI <ai@example.com>"
```

### Phase 2: 单元测试 + Bug修复

完成单元测试，发现并修复问题，然后进行 **Commit 2**:

```bash
git add .
git commit -m "Sprint 5: [模块名称] 单元测试与Bug修复

- 添加单元测试X个
- 修复问题Y

Co-Authored-By: AI <ai@example.com>"
```

### Phase 3: 编写模块文档

编写该模块的README或JSDoc，完成后进行 **Commit 3**:

```bash
git add .
git commit -m "Sprint 5: [模块名称] 文档完善

- 添加API文档
- 添加使用示例

Co-Authored-By: AI <ai@example.com>"
```

---

## 4. Sprint 5 完成标准

### 模块验收清单

| 模块 | 验收状态 | 完成标准 |
|-----|---------|---------|
| 5.1 文件夹管理 | [x] | CRUD操作正常 |
| 5.2 文档拉取 | [ ] | 能获取文档列表和内容 |
| 5.3 文档分块 | [ ] | 按配置分块 |
| 5.4 Embedding | [ ] | 向量生成正确 |
| 5.5 向量存储 | [ ] | LanceDB读写正常 |
| 5.6 检索服务 | [ ] | 语义检索返回结果 |

### Sprint交付物

- 知识库文件夹管理器
- 文档拉取服务
- 文档分块服务
- Embedding服务
- LanceDB向量存储
- RAG Pipeline

### Sprint验证

```bash
# 1. 配置飞书文件夹
curl -X POST http://localhost:3000/api/admin/kb/folders \
  -H "Content-Type: application/json" \
  -d '{"name":"AI沉淀","url":"https://xxx.feishu.cn/drive/folder/xxx"}'

# 2. 触发同步
curl -X POST http://localhost:3000/api/admin/kb/sync \
  -H "Content-Type: application/json" \
  -d '{"folderId":"<folder_id>"}'

# 3. 查看统计
curl http://localhost:3000/api/admin/kb/stats

# 4. 测试检索（通过Tool Calling）
```

---

## 5. Sprint间依赖

**依赖Sprint 5的模块**: Sprint 6 (Tool Calling)  
**被Sprint 5依赖**: Sprint 1, Sprint 4

---

**文档版本**: v1.0  
**制定日期**: 2026-04-11  
**依据文档**: ai_feishu-PRD-正式版 v1.1
