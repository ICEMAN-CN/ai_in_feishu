# Sprint 1: 基础设施建设

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint周期**: 1周  
**前置依赖**: 无  
**Sprint目标**: 完成项目骨架搭建、数据库初始化、飞书机器人创建  

---

## 1. 模块划分

### 模块 1.1: 项目脚手架搭建
### 模块 1.2: 数据库初始化 (SQLite + LanceDB)
### 模块 1.3: 飞书应用创建与配置
### 模块 1.4: 安全加固 (AES-256-GCM加密)

---

## 2. 模块详细规格

### 模块 1.1: 项目脚手架搭建

**文件路径**: `ai_feishu/`

#### 2.1.1 创建目录结构

按照PRD 2.7目录结构创建完整目录：

```
ai_feishu/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .env.example
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── core/
│   ├── routers/
│   ├── services/
│   ├── tools/
│   ├── feishu/
│   └── types/
├── admin/
│   └── (React前端结构)
├── data/
├── scripts/
└── tests/
```

#### 2.1.2 package.json 依赖

```json
{
  "name": "ai-feishu",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && vite build",
    "start": "node dist/index.js",
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@ai-sdk/sdk": "^0.10.0",
    "@larksuiteoapi/node-sdk": "^1.5.0",
    "better-sqlite3": "^9.0.0",
    "hono": "^4.0.0",
    "lancedb": "^0.4.0",
    "@langchain/core": "^0.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "5.3.0",
    "vite": "5.0.0",
    "tsx": "^4.0.0",
    "vitest": "^1.0.0"
  }
}
```

#### 2.1.3 TypeScript配置 (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 2.1.4 环境变量模板 (.env.example)

```bash
# ==================== 飞书配置 ====================
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
FEISHU_BOT_NAME=AI_Feishu

# ==================== MCP配置 ====================
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_TOKEN=
MCP_FALLBACK_ENABLED=true

# ==================== LLM配置 ====================
OPENAI_API_KEY=sk-xxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1

ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxx
ANTHROPIC_BASE_URL=https://api.anthropic.com

GEMINI_API_KEY=xxxxxxxxxxxxxx

OLLAMA_BASE_URL=http://localhost:11434

# ==================== Embedding配置 ====================
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# ==================== 系统配置 ====================
PORT=3000
ADMIN_PORT=3001
LOG_LEVEL=info
NODE_ENV=development
ADMIN_API_SECRET=

# ==================== 知识库配置 ====================
KB_FOLDER_URLS=
KB_SYNC_INTERVAL=3600
KB_CHUNK_SIZE=500
KB_CHUNK_OVERLAP=50
THREAD_MESSAGE_LIMIT=20
MAX_RETRIEVAL_CHUNKS=5
MAX_MESSAGE_LENGTH=10000

# ==================== 安全配置 ====================
ALLOWED_FEISHU_USERS=
ENCRYPTION_KEY=

# ==================== 存储配置 ====================
DATA_DIR=./data
VECTOR_DB_PATH=./data/vectors
SQLITE_PATH=./data/config.db
```

#### 2.1.5 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 目录结构 | 目录结构与PRD设计完全一致 | `ls -la` 检查 |
| package.json | 所有依赖版本锁定，无缺失 | `npm install` 无报错 |
| tsconfig.json | 类型检查通过 | `npx tsc --noEmit` 无错误 |
| .env.example | 所有配置项有注释说明 | 人工检查 |

#### 2.1.6 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-1.1-001 | 执行 npm install | 无报错，node_modules生成 | 命令行验证 |
| TC-1.1-002 | 执行 npx tsc --noEmit | 无类型错误 | 命令行验证 |
| TC-1.1-003 | 创建 src/index.ts 空文件 | 能被TypeScript识别 | `npx tsc` 编译成功 |

---

### 模块 1.2: 数据库初始化 (SQLite + LanceDB)

**文件路径**: `src/core/config-store.ts`, `src/core/vector-store.ts`, `scripts/init-db.ts`

#### 2.2.1 SQLite数据库Schema

```sql
-- 配置数据库版本
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- 模型配置表
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'gemini', 'ollama')),
  api_key_encrypted TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model_id TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 4096,
  temperature REAL DEFAULT 0.7,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL UNIQUE,
  p2p_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  system_prompt TEXT,
  message_count INTEGER DEFAULT 0,
  message_limit INTEGER DEFAULT 20,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- 知识库文件夹表
CREATE TABLE IF NOT EXISTS kb_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  folder_token TEXT NOT NULL,
  last_sync_at TEXT,
  last_sync_doc_count INTEGER DEFAULT 0,
  sync_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

-- MCP工具授权表
CREATE TABLE IF NOT EXISTS mcp_tool_auth (
  tool_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  fallback_enabled INTEGER DEFAULT 1,
  fallback_method TEXT,
  updated_at TEXT NOT NULL
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sessions_thread ON sessions(thread_id);
CREATE INDEX IF NOT EXISTS idx_sessions_p2p ON sessions(p2p_id);
CREATE INDEX IF NOT EXISTS idx_kb_folders_token ON kb_folders(folder_token);
```

#### 2.2.2 SQLite初始化脚本 (scripts/init-db.ts)

```typescript
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
const SQLITE_PATH = process.env.SQLITE_PATH || join(DATA_DIR, 'config.db');

export function initDatabase(): Database.Database {
  // 确保数据目录存在
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(SQLITE_PATH);
  db.pragma('journal_mode = WAL');

  // 执行Schema
  db.exec(`
    -- 配置数据库版本
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    -- 模型配置表
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      api_key_encrypted TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model_id TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      max_tokens INTEGER DEFAULT 4096,
      temperature REAL DEFAULT 0.7,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 会话表
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      p2p_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      system_prompt TEXT,
      message_count INTEGER DEFAULT 0,
      message_limit INTEGER DEFAULT 20,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_message_at TEXT,
      FOREIGN KEY (model_id) REFERENCES models(id)
    );

    -- 知识库文件夹表
    CREATE TABLE IF NOT EXISTS kb_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      folder_token TEXT NOT NULL,
      last_sync_at TEXT,
      last_sync_doc_count INTEGER DEFAULT 0,
      sync_enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- MCP工具授权表
    CREATE TABLE IF NOT EXISTS mcp_tool_auth (
      tool_name TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      fallback_enabled INTEGER DEFAULT 1,
      fallback_method TEXT,
      updated_at TEXT NOT NULL
    );

    -- 系统配置表
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_sessions_thread ON sessions(thread_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_p2p ON sessions(p2p_id);
    CREATE INDEX IF NOT EXISTS idx_kb_folders_token ON kb_folders(folder_token);
  `);

  // 记录Schema版本
  const version = db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null };
  const currentVersion = version.v || 0;
  
  if (currentVersion < 1) {
    db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(1, new Date().toISOString());
  }

  return db;
}
```

#### 2.2.3 LanceDB初始化 (src/core/vector-store.ts)

```typescript
import { connect, Table, Schema, Float32, Int32, Utf8, Int64 } from 'vectordb';

const VECTOR_DB_PATH = process.env.VECTOR_DB_PATH || './data/vectors';
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536');

const chunkSchema = new Schema({
  id: new Int32(),
  doc_id: new Utf8(),
  doc_title: new Utf8(),
  doc_url: new Utf8(),
  folder_id: new Utf8(),
  text_chunk: new Utf8(),
  token_count: new Int32(),
  vector: new Float32(EMBEDDING_DIMENSION),
  doc_updated_at: new Int64(),
  chunk_index: new Int32(),
  created_at: new Int64(),
  sync_status: new Utf8(),
});

export interface VectorStore {
  table: Table;
  db: any;
}

export async function initVectorStore(): Promise<VectorStore> {
  const db = await connect(VECTOR_DB_PATH);
  
  // 如果表已存在，直接返回
  const tableNames = await db.tableNames();
  if (tableNames.includes('document_chunks')) {
    const table = await db.openTable('document_chunks');
    return { table, db };
  }

  // 创建表
  const table = await db.createTable('document_chunks', chunkSchema, {
    writeMode: 'overwrite',
  });

  // 创建向量索引
  await table.createIndex({
    type: 'IVF_PQ',
    numSubvectors: 96,
  });

  return { table, db };
}
```

#### 2.2.4 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| SQLite创建 | config.db文件在data/目录生成 | `ls data/config.db` |
| Schema正确 | 所有表和索引创建成功 | `sqlite3 data/config.db ".tables"` |
| LanceDB创建 | vectors/目录生成 | `ls data/vectors/` |
| 表结构正确 | document_chunks表存在 | `npm run init-db && ls data/` |

#### 2.2.5 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-1.2-001 | 运行 init-db.ts | data/config.db生成 | 命令行检查文件 |
| TC-1.2-002 | 查询 .tables | 6张表列出 | sqlite3命令 |
| TC-1.2-003 | 初始化LanceDB | data/vectors/目录生成 | 命令行检查目录 |
| TC-1.2-004 | 重复运行init | 不报错，幂等执行 | 多次运行验证 |

---

### 模块 1.3: 飞书应用创建与配置

**文件路径**: `src/feishu/client.ts`, `src/types/config.ts`

#### 2.3.1 飞书SDK客户端 (src/feishu/client.ts)

```typescript
import { Client, JLPT } from '@larksuiteoapi/node-sdk';

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BOT_NAME = process.env.FEISHU_BOT_NAME || 'AI_Feishu';

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  botName: string;
}

export function createFeishuClient(config?: FeishuConfig): Client {
  const appId = config?.appId || FEISHU_APP_ID;
  const appSecret = config?.appSecret || FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('FEISHU_APP_ID and FEISHU_APP_SECRET must be set');
  }

  return new Client({
    appId,
    appSecret,
    loggerLevel: JLPT.DEBUG,
  });
}

export const feishuClient = createFeishuClient();

export function getFeishuBotName(): string {
  return process.env.FEISHU_BOT_NAME || FEISHU_BOT_NAME;
}
```

#### 2.3.2 配置类型定义 (src/types/config.ts)

```typescript
// 飞书配置
export interface FeishuConfig {
  appId: string;
  appSecret: string;
  botName: string;
}

// 模型配置
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  apiKeyEncrypted: string;
  baseUrl: string;
  modelId: string;
  isDefault: boolean;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 会话配置
export interface Session {
  id: string;
  threadId: string;
  p2pId: string;
  modelId: string;
  systemPrompt?: string;
  messageCount: number;
  messageLimit: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

// 知识库文件夹
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

// MCP工具授权
export interface MCPToolAuth {
  toolName: string;
  enabled: boolean;
  fallbackEnabled: boolean;
  fallbackMethod?: string;
}

// 系统配置
export interface SystemConfig {
  [key: string]: string;
}
```

#### 2.3.3 飞书应用创建检查清单

1. 访问 https://open.feishu.cn/app
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 配置机器人能力
5. 申请权限：
   - im:message:send_as_bot
   - im:message:receive_v1
   - docx:document:readonly
   - docx:document:create
   - drive:drive:readonly
   - drive:folder:readonly

#### 2.3.4 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| SDK导入 | @larksuiteoapi/node-sdk正确安装 | `npm list @larksuiteoapi/node-sdk` |
| 客户端创建 | createFeishuClient能实例化 | 单元测试 |
| 配置读取 | 环境变量正确读取 | 运行时日志检查 |
| 权限配置 | 飞书应用具备所需权限 | 飞书开放平台检查 |

#### 2.3.5 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-1.3-001 | 未设置环境变量时创建客户端 | 抛出明确错误 | JEST测试 |
| TC-1.3-003 | 设置环境变量后创建客户端 | 客户端实例化成功 | JEST测试 |
| TC-1.3-004 | 获取机器人名称 | 返回配置的名称 | 单元测试 |

---

### 模块 1.4: 安全加固 (AES-256-GCM加密)

**文件路径**: `src/core/encryption.ts`

#### 2.4.1 加密实现

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable must be set');
  }
  
  // 必须是32字节的hex字符串
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  return Buffer.from(key, 'hex');
}

export function encrypt(plainText: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decrypt(data: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(data.iv, 'base64');
  const tag = Buffer.from(data.tag, 'base64');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// SQLCipher格式存储
export function encryptForStorage(plainText: string): string {
  const encrypted = encrypt(plainText);
  return JSON.stringify(encrypted);
}

export function decryptFromStorage(encryptedStr: string): string {
  const data: EncryptedData = JSON.parse(encryptedStr);
  return decrypt(data);
}
```

#### 2.4.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 加密实现 | 相同明文每次加密结果不同（因IV随机） | 多次加密对比 |
| 解密正确 | 解密后内容与原始明文一致 | roundtrip测试 |
| Key格式验证 | Key不是64hex时抛出错误 | 边界测试 |
| 存储格式 | 存储格式为JSON可解析 | 单元测试 |

#### 2.4.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-1.4-001 | 加密"test" | 返回EncryptedData结构 | 单元测试 |
| TC-1.4-002 | 加密后解密 | 解密内容=原始内容 | 单元测试 |
| TC-1.4-003 | 相同内容多次加密 | ciphertext不同（IV不同） | 单元测试 |
| TC-1.4-004 | Key长度错误 | 抛出ValidationError | 边界测试 |
| TC-1.4-005 | 篡改密文后解密 | 抛出AuthTagError | 安全测试 |

---

## 3. 开发流程

### Phase 1: 模块实现

每个模块完成后进行 **Commit 1**:

```bash
git add .
git commit -m "Sprint 1: 完成 [模块名称] 模块

- 实现功能点A
- 实现功能点B

Co-Authored-By: AI <ai@example.com>"
```

### Phase 2: 单元测试 + Bug修复

完成单元测试，发现并修复问题，然后进行 **Commit 2**:

```bash
git add .
git commit -m "Sprint 1: [模块名称] 单元测试与Bug修复

- 添加单元测试X个
- 修复问题Y

Co-Authored-By: AI <ai@example.com>"
```

### Phase 3: 编写模块文档

编写该模块的README或JSDoc，完成后进行 **Commit 3**:

```bash
git add .
git commit -m "Sprint 1: [模块名称] 文档完善

- 添加API文档
- 添加使用示例

Co-Authored-By: AI <ai@example.com>"
```

---

## 4. Sprint 1 完成标准

### 模块验收清单

| 模块 | 验收状态 | 完成标准 |
|-----|---------|---------|
| 1.1 项目脚手架 | [ ] | 目录结构完整，依赖安装成功 |
| 1.2 数据库初始化 | [ ] | SQLite和LanceDB初始化成功 |
| 1.3 飞书配置 | [ ] | SDK客户端能实例化 |
| 1.4 安全加固 | [ ] | 加密解密roundtrip正确 |

### Sprint交付物

- 可运行的项目脚手架
- 数据库初始化脚本
- 环境变量完整模板
- 飞书SDK集成基础
- AES-256-GCM加密工具

---

## 5. Sprint间依赖

**依赖Sprint 1的模块**: Sprint 2, Sprint 3, Sprint 4, Sprint 5

---

**文档版本**: v1.0  
**制定日期**: 2026-04-11  
**依据文档**: ai_feishu-PRD-正式版 v1.1
