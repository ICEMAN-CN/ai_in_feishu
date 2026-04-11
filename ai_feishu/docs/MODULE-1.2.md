# Module 1.2: 数据库初始化 (SQLite + LanceDB)

**Sprint**: Sprint 1 - 基础设施建设
**状态**: ✅ 完成
**日期**: 2026-04-11

---

## 概述

本模块完成了 SQLite 配置数据库和 LanceDB 向量数据库的初始化，提供数据存储的基础设施。

## 文件结构

```
src/
├── core/
│   ├── config-store.ts    # SQLite CRUD 操作
│   └── vector-store.ts    # LanceDB 向量存储
├── types/
│   └── config.ts         # 类型定义
scripts/
└── init-db.ts           # CLI 初始化脚本
```

## SQLite Schema

### 表结构

| 表名 | 说明 |
|------|------|
| `schema_version` | 数据库版本记录 |
| `models` | AI 模型配置（provider, apiKey, baseUrl 等） |
| `sessions` | 会话表（Thread 绑定模型） |
| `kb_folders` | 知识库文件夹配置 |
| `mcp_tool_auth` | MCP 工具授权配置 |
| `system_config` | 系统配置键值对 |

### 索引

- `idx_sessions_thread` - 会话 thread_id 索引
- `idx_sessions_p2p` - 会话 p2p_id 索引
- `idx_kb_folders_token` - 文件夹 token 索引

## API

### config-store.ts

#### Models

```typescript
getDefaultModel(): ModelConfig | null
getModel(id: string): ModelConfig | null
getAllModels(): ModelConfig[]
getEnabledModels(): ModelConfig[]
saveModel(model: ModelConfig): void
deleteModel(id: string): void
```

#### Sessions

```typescript
getSession(threadId: string): Session | null
getSessionByP2P(p2pId: string): Session[]
saveSession(session: Session): void
deleteSession(id: string): void
```

#### KB Folders

```typescript
getKBFolder(id: string): KBFolder | null
getAllKBFolders(): KBFolder[]
getEnabledKBFolders(): KBFolder[]
saveKBFolder(folder: KBFolder): void
deleteKBFolder(id: string): void
```

#### MCP Tool Auth

```typescript
getMCPToolAuth(toolName: string): MCPToolAuth | null
getAllMCPToolAuths(): MCPToolAuth[]
saveMCPToolAuth(auth: MCPToolAuth): void
```

#### System Config

```typescript
getSystemConfig(key: string): string | null
setSystemConfig(key: string, value: string): void
getAllSystemConfig(): SystemConfig
```

#### Utility

```typescript
initDatabase(): Database.Database
getDb(): Database.Database
closeDb(): void
```

### vector-store.ts

```typescript
initVectorStore(): Promise<VectorStoreInstance>
getVectorStore(): Promise<VectorStoreInstance>
addChunks(chunks: Omit<DocumentChunk, 'id'>[]): Promise<void>
searchChunks(queryVector: number[], topK?: number): Promise<SearchResult[]>
getChunksByDocId(docId: string): Promise<SearchResult[]>
getChunkCount(): Promise<number>
closeVectorStore(): Promise<void>
```

## 类型定义

### ModelConfig

```typescript
interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  apiKeyEncrypted: string;  // AES-256-GCM 加密
  baseUrl: string;
  modelId: string;
  isDefault: boolean;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Session

```typescript
interface Session {
  id: string;
  threadId: string;        // 飞书 root_id
  p2pId: string;           // 私聊会话ID
  modelId: string;         // 绑定模型
  systemPrompt?: string;
  messageCount: number;
  messageLimit: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}
```

## CLI 命令

```bash
# 初始化数据库
npm run init-db

# 或直接运行
npx tsx scripts/init-db.ts
```

## 验证

```bash
# 检查 SQLite 表
sqlite3 data/config.db ".tables"

# 输出: kb_folders mcp_tool_auth models schema_version sessions system_config

# 检查 LanceDB 目录
ls data/vectors/
```

## 依赖

- `better-sqlite3` - SQLite 驱动
- `@lancedb/lancedb` - 向量数据库

## 注意事项

1. **数据库路径**: 由环境变量 `DATA_DIR` 和 `SQLITE_PATH` 控制
2. **WAL 模式**: SQLite 启用 WAL 提高并发性能
3. **外键约束**: 启用 `foreign_keys = ON`
4. **LanceDB**: Phase 1 使用简化实现
   - ⚠️ **已知限制**: `where()` 查询暂未实现（LanceDB Rust SDK 限制）
   - 将在 Sprint 5 RAG Pipeline 中解决
   - 当前 `getChunksByDocId` 使用全表扫描替代

## 下一步

- Sprint 1 Module 1.3: 飞书应用创建与配置
- Sprint 5: RAG Pipeline（完善向量存储和检索）
