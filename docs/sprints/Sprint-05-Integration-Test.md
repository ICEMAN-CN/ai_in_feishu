# Sprint 5 RAG Pipeline Integration Test Documentation

**项目**: AI_Feishu - 飞书原生本地 AI 知识库
**Sprint**: 5 - RAG Pipeline
**文档版本**: v1.0
**更新日期**: 2026-04-16

---

## 1. 概述

本文档描述 Sprint 5 RAG Pipeline 集成测试的完整测试流程、测试用例和验证方法。

### 1.1 测试范围

| 模块 | 名称 | 测试类型 |
|------|------|----------|
| 5.1 | 知识库文件夹管理 | API + 端到端 |
| 5.2 | 文档拉取服务 | 单元测试 (需要真实飞书凭证) |
| 5.3 | 文档分块服务 | 单元测试 (通过 sync 流程验证) |
| 5.4 | Embedding 服务 | 配置验证 |
| 5.5 | LanceDB 向量存储 | API + 端到端 |
| 5.6 | 语义检索服务 | API + 端到端 |

### 1.2 测试目标

1. 验证各模块之间的集成正确性
2. 验证完整 RAG Pipeline 流程 (文件夹 -> 文档 -> 分块 -> Embedding -> 存储 -> 检索)
3. 验证 API 端点功能正常
4. 确保单元测试不被破坏

---

## 2. 前置条件

### 2.1 环境要求

| 要求 | 说明 |
|------|------|
| Node.js | LTS v20+ |
| npm | 最新版 |
| 服务器 | `npm run dev` 运行在 `localhost:3000` |

### 2.2 环境变量

```bash
# 飞书配置 (用于模块 5.2 文档拉取)
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# Embedding 配置 (用于模块 5.4)
OPENAI_API_KEY=sk-...          # 或使用 Ollama
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# 管理 API 认证 (可选)
ADMIN_API_KEY=your_admin_key
```

### 2.3 启动服务

```bash
cd ai_feishu
npm run dev
```

服务启动后应看到:
```
Callback server running at http://localhost:3000
```

---

## 3. 测试脚本

### 3.1 脚本位置

```
ai_feishu/scripts/test-sprint5-integration.sh
```

### 3.2 使用方法

```bash
# 基本用法
./scripts/test-sprint5-integration.sh

# 指定服务器地址
./scripts/test-sprint5-integration.sh --server http://localhost:3000

# 使用 API Key
./scripts/test-sprint5-integration.sh --api-key your_admin_key
```

### 3.3 输出示例

```
===============================================
  Sprint 5 RAG Pipeline Integration Tests
===============================================

[INFO] Server is running at http://localhost:3000

========================================
  5.1 Knowledge Base Folder Manager
========================================
[PASS] TC-5.1-001: Add folder - PASSED
[PASS] TC-5.1-002: Get folders - PASSED
[PASS] TC-5.1-003: Delete folder - PASSED

========================================
  5.6 RAG Pipeline (Semantic Search)
========================================
[PASS] TC-5.6-001: Single folder sync - PASSED
[PASS] TC-5.6-003: Stats endpoint working - PASSED

========================================
  Test Summary
========================================
Passed: 12
Failed: 0
Total:  12

All tests passed!
```

---

## 4. 测试用例详解

### 4.1 Module 5.1: 知识库文件夹管理

#### TC-5.1-001: 添加文件夹

**测试步骤**:
```bash
curl -X POST http://localhost:3000/api/admin/kb/folders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Folder",
    "url": "https://xxx.feishu.cn/drive/folder/test123"
  }'
```

**预期结果**:
```json
{"success": true, "id": "<folder_id>"}
```

**验证方法**: 检查返回的 JSON 包含 `success: true` 和文件夹 ID

---

#### TC-5.1-002: 获取所有文件夹

**测试步骤**:
```bash
curl http://localhost:3000/api/admin/kb/folders
```

**预期结果**:
```json
{"folders": [...]}
```

**验证方法**: 检查返回的 JSON 包含 `folders` 数组

---

#### TC-5.1-003: 删除文件夹

**测试步骤**:
```bash
curl -X DELETE http://localhost:3000/api/admin/kb/folders/<folder_id>
```

**预期结果**:
```json
{"success": true}
```

**验证方法**: 检查返回的 JSON 包含 `success: true`

---

### 4.2 Module 5.5: LanceDB 向量存储

#### TC-5.5-003: 统计查询

**测试步骤**:
```bash
curl http://localhost:3000/api/admin/kb/stats
```

**预期结果**:
```json
{
  "totalChunks": <number>,
  "totalDocuments": <number>
}
```

**验证方法**: 检查返回的 JSON 包含 `totalChunks` 字段

---

### 4.3 Module 5.6: RAG Pipeline

#### TC-5.6-001: 单文件夹同步

**测试步骤**:
```bash
# 1. 创建测试文件夹
curl -X POST http://localhost:3000/api/admin/kb/folders \
  -H "Content-Type: application/json" \
  -d '{"name": "Sync Test", "url": "https://xxx.feishu.cn/drive/folder/synctest"}'

# 2. 触发同步
curl -X POST http://localhost:3000/api/admin/kb/sync \
  -H "Content-Type: application/json" \
  -d '{"folderId": "<folder_id>"}'
```

**预期结果**:
```json
{"success": true, "message": "Synced N documents"}
```

**验证方法**: 
- 检查返回的 JSON 包含 `success: true`
- 检查 `totalChunks` 数量增加

---

#### TC-5.6-002: 全量同步

**测试步骤**:
```bash
curl -X POST http://localhost:3000/api/admin/kb/sync \
  -H "Content-Type: application/json" \
  -d '{}'
```

**预期结果**:
```json
{
  "success": true,
  "message": "Synced N documents from M folders",
  "totalSynced": <number>,
  "folderCount": <number>
}
```

**验证方法**: 检查返回的 JSON 包含成功标记和统计信息

---

#### TC-5.6-003: 语义检索

**测试步骤**:
```bash
# 先同步文档，然后测试检索
curl -X POST http://localhost:3000/api/admin/kb/sync -d '{}'
curl http://localhost:3000/api/admin/kb/stats
```

**预期结果**:
- Stats 显示有文档已索引 (`totalChunks > 0`)
- 可以通过 Tool Calling 调用 `search_local_kb` 进行检索

**验证方法**: 
- `totalChunks > 0` 表示文档已索引
- 检索功能由 Sprint 6 Tool Calling 集成后测试

---

## 5. 完整流程测试

### 5.1 RAG Pipeline 完整流程

```
1. [创建文件夹] POST /api/admin/kb/folders
   ↓
2. [触发同步] POST /api/admin/kb/sync
   ↓
3. [获取文档列表] Feishu API listDocumentsInFolder
   ↓
4. [获取文档内容] Feishu API getDocument
   ↓
5. [分块] ChunkingService.chunkDocument
   ↓
6. [Embedding] EmbeddingService.embedBatch
   ↓
7. [存储] LanceDB addChunks
   ↓
8. [检索] searchChunks
```

### 5.2 手动测试流程

```bash
#!/bin/bash
# 完整流程测试

SERVER="http://localhost:3000"

# Step 1: 创建测试文件夹
echo "Step 1: Creating folder..."
FOLDER_RESP=$(curl -s -X POST "$SERVER/api/admin/kb/folders" \
  -H "Content-Type: application/json" \
  -d '{"name": "Manual Test", "url": "https://xxx.feishu.cn/drive/folder/manualtest"}')
echo "$FOLDER_RESP"

# Step 2: 提取 folder_id
FOLDER_ID=$(echo "$FOLDER_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Folder ID: $FOLDER_ID"

# Step 3: 触发同步
echo "Step 2: Triggering sync..."
SYNC_RESP=$(curl -s -X POST "$SERVER/api/admin/kb/sync" \
  -H "Content-Type: application/json" \
  -d "{\"folderId\":\"$FOLDER_ID\"}")
echo "$SYNC_RESP"

# Step 4: 检查统计
echo "Step 3: Checking stats..."
STATS_RESP=$(curl -s "$SERVER/api/admin/kb/stats")
echo "$STATS_RESP"

# Step 5: 清理
echo "Step 4: Cleanup..."
curl -s -X DELETE "$SERVER/api/admin/kb/folders/$FOLDER_ID"
echo "Done"
```

---

## 6. 单元测试验证

### 6.1 运行单元测试

```bash
cd ai_feishu
npm test -- --run
```

### 6.2 预期结果

```
Test Files  23 passed (23)
     Tests  249 passed (249)
```

### 6.3 Sprint 5 相关测试文件

| 测试文件 | 测试模块 | 测试数量 |
|---------|---------|----------|
| `tests/kb-folder-manager.test.ts` | 5.1 | 10 |
| `tests/feishu-doc.test.ts` | 5.2 | 14 |
| `tests/chunking.test.ts` | 5.3 | 21 |
| `tests/embedding.test.ts` | 5.4 | 8 |
| `tests/vector-store.test.ts` | 5.5 | 16 |
| `tests/rag-pipeline.test.ts` | 5.6 | 11 |

---

## 7. 故障排查

### 7.1 服务器无法连接

**问题**: `curl: Failed to connect to localhost:3000`

**解决**:
```bash
cd ai_feishu
npm run dev
# 确保服务启动
```

### 7.2 同步返回 500 错误

**问题**: `{"success": false, "message": "..."}`

**可能原因**:
1. 飞书凭证未配置
2. Embedding API 未配置
3. LanceDB 数据目录无权限

**解决**:
```bash
# 检查环境变量
echo $FEISHU_APP_ID
echo $OPENAI_API_KEY

# 检查数据目录
ls -la ai_feishu/data/
```

### 7.3 向量存储为空

**问题**: `totalChunks: 0` 即使同步成功

**可能原因**:
1. 文件夹中没有文档
2. 文档内容太短被分块过滤
3. Embedding API 调用失败

**解决**:
- 确认飞书文件夹中有足够内容的文档
- 检查 Embedding API 配置

---

## 8. 验收标准

### 8.1 功能验收

| 验收项 | 标准 | 验证方法 |
|--------|------|----------|
| 文件夹管理 | CRUD 操作正常 | API 测试 |
| 文档同步 | 文档能入库 | 检查 `totalChunks` 增加 |
| 向量检索 | 返回相关片段 | 通过 Tool Calling |
| 统计查询 | 返回正确数量 | API 测试 |

### 8.2 测试覆盖

| 模块 | 单元测试 | 集成测试 |
|------|----------|----------|
| 5.1 | ✅ 10个 | ✅ |
| 5.2 | ✅ 14个 | ⚠️ 需要飞书凭证 |
| 5.3 | ✅ 21个 | ✅ 通过 sync 流程 |
| 5.4 | ✅ 8个 | ⚠️ 需要 API Key |
| 5.5 | ✅ 16个 | ✅ |
| 5.6 | ✅ 11个 | ✅ |

### 8.3 Sprint 5 完成标准

- [x] 所有单元测试通过 (249 tests)
- [x] 集成测试脚本可执行
- [x] API 端点响应正常
- [x] 文档完整

---

## 9. 附录

### 9.1 相关文件

| 文件 | 说明 |
|------|------|
| `src/services/rag-pipeline.ts` | RAG Pipeline 实现 |
| `src/routers/admin-kb.ts` | Admin KB 路由 |
| `src/core/vector-store.ts` | LanceDB 封装 |
| `src/core/kb-folder-manager.ts` | 文件夹管理 |
| `scripts/test-sprint5-integration.sh` | 集成测试脚本 |

### 9.2 环境变量参考

```bash
# Server
PORT=3000

# Feishu
FEISHU_APP_ID=
FEISHU_APP_SECRET=

# Embedding
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
OPENAI_API_KEY=

# RAG
KB_CHUNK_SIZE=500
KB_CHUNK_OVERLAP=50
MAX_RETRIEVAL_CHUNKS=5

# Admin
ADMIN_API_KEY=
```

---

**文档版本**: v1.0  
**制定日期**: 2026-04-16  
**依据文档**: Sprint-05-RAG-Pipeline.md
