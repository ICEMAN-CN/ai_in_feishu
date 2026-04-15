# Sprint 3.1 Plan: Session会话管理

## TL;DR

> **Quick Summary**: 实现Session会话管理器，支持Thread绑定模型、消息计数、Session持久化
> 
> **Deliverables**:
> - `src/core/session-manager.ts` - SessionManager类
> - `tests/session-manager.test.ts` - 单元测试
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES
> **Critical Path**: 安装uuid依赖 → 实现SessionManager → 编写测试 → 验证

---

## Context

### Sprint 3 Overview
Sprint 3的目标是完成多模型配置、流式输出、会话管理。Module 3.1是基础模块，被3.2/3.3/3.5依赖。

### Module 3.1 Spec Summary
根据`docs/sprints/Sprint-03-模型路由与对话.md`：
- Session类型定义 (`src/types/session.ts` 或复用 `src/types/config.ts`)
- SessionManager类 (`src/core/session-manager.ts`)
- 核心功能：createOrGetSession、getSessionByThreadId、saveSession、updateSessionMessage

### 已有基础设施
| 组件 | 状态 | 说明 |
|------|------|------|
| Session类型 | ✅ 已存在 | `src/types/config.ts` - 与spec匹配 |
| sessions表 | ✅ 已存在 | `config-store.ts` 中定义 |
| getSession/saveSession | ✅ 已存在 | `config-store.ts` 中 |
| uuid | ❌ 需安装 | 需添加依赖 |

### 研究发现
1. **类型已存在**：`Session` interface在`src/types/config.ts`，无需新建文件
2. **数据库CRUD已存在**：`getSession()`, `saveSession()` 在 `config-store.ts`
3. **缺失**：业务逻辑层 `SessionManager` 类，包含 `createOrGetSession()` 等

---

## Work Objectives

### Core Objective
实现Session会话管理器，提供Thread级别的AI对话会话管理能力。

### Concrete Deliverables
- [ ] `src/core/session-manager.ts` - SessionManager类
- [ ] `tests/session-manager.test.ts` - 单元测试
- [ ] 通过所有测试验证

### Definition of Done
- [ ] `npm test -- --run` 全部通过
- [ ] TC-3.1-001 到 TC-3.1-004 全部通过

### Must Have
- createOrGetSession - 新Thread创建Session，已有Thread返回
- getSessionByThreadId - 根据threadId查询
- saveSession - 持久化到SQLite
- updateSessionMessage - 更新消息计数
- 消息limit配置

### Must NOT Have
- 不要修改已存在的 `config-store.ts` 底层CRUD
- 不要实现消息历史存储（spec标注为后续实现）

---

## Verification Strategy

### Test Infrastructure
- **Framework**: vitest (已配置)
- **Database**: 使用内存SQLite进行测试
- **Mock策略**: 不mock数据库，真实操作SQLite

### QA Policy
Every task MUST include agent-executed QA scenarios.

---

## Execution Strategy

### Tasks

#### Task 1: 安装uuid依赖

**What to do**:
```bash
npm install uuid
npm install -D @types/uuid
```

**Must NOT do**: 无

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Blocks**: Task 2

**References**:
- `package.json` - 添加依赖的位置

**Acceptance Criteria**:
- [ ] `package.json` 包含 `uuid` 和 `@types/uuid`
- [ ] `npm install` 成功

---

#### Task 2: 实现SessionManager类

**What to do**:
创建 `src/core/session-manager.ts`：

```typescript
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../types/config';
import { getSession, saveSession as dbSaveSession, getDefaultModel } from './config-store';

const THREAD_MESSAGE_LIMIT = parseInt(process.env.THREAD_MESSAGE_LIMIT || '20');

export class SessionManager {
  constructor(private db: Database) {}

  async createOrGetSession(
    p2pId: string,
    rootId?: string,
    parentId?: string,
    modelId?: string
  ): Promise<Session> {
    // 情况1: parentId为空或parentId=rootId = 新Thread的第一条消息
    if (!parentId || parentId === rootId) {
      const threadId = rootId || uuidv4();
      
      const existing = this.getSessionByThreadId(threadId);
      if (existing) {
        return existing;
      }

      const session: Session = {
        id: uuidv4(),
        threadId,
        p2pId,
        modelId: modelId || this.getDefaultModelId() || '',
        systemPrompt: '',
        messageCount: 0,
        messageLimit: THREAD_MESSAGE_LIMIT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.saveSession(session);
      return session;
    }

    // 情况2: parentId不为空 = Thread已存在
    const existingSession = this.getSessionByThreadId(rootId!);
    if (!existingSession) {
      throw new Error(`Thread不存在: rootId=${rootId}, parentId=${parentId}`);
    }
    return existingSession;
  }

  getSessionByThreadId(threadId: string): Session | null {
    return getSession(threadId);
  }

  saveSession(session: Session): void {
    dbSaveSession(session);
  }

  updateSessionMessage(sessionId: string, increment: number = 1): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE sessions 
      SET message_count = message_count + ?, updated_at = ?, last_message_at = ?
      WHERE id = ?
    `).run(increment, now, now, sessionId);
  }

  private getDefaultModelId(): string | null {
    const model = getDefaultModel();
    return model?.id || null;
  }
}
```

**Must NOT do**:
- 不要修改config-store.ts的底层实现
- 不要实现消息历史（placeholder返回空数组）

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES (with Task 1, after Task 1)
- **Blocks**: Task 3

**References**:
- `src/types/config.ts:32-43` - Session类型定义
- `src/core/config-store.ts:215-250` - 已有getSession, saveSession实现
- `docs/sprints/Sprint-03-模型路由与对话.md:55-176` - 完整spec

**Acceptance Criteria**:
- [ ] SessionManager类导出
- [ ] createOrGetSession实现两种情况
- [ ] getSessionByThreadId委托给config-store
- [ ] saveSession委托给config-store
- [ ] updateSessionMessage更新计数

---

#### Task 3: 编写SessionManager单元测试

**What to do**:
创建 `tests/session-manager.test.ts`：

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionManager } from '../src/core/session-manager';
import { initDatabase } from '../src/core/config-store';

describe('SessionManager', () => {
  let db: Database.Database;
  let sessionManager: SessionManager;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL UNIQUE,
        p2p_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        system_prompt TEXT,
        message_count INTEGER DEFAULT 0,
        message_limit INTEGER DEFAULT 20,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_message_at TEXT
      );
      CREATE TABLE models (
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
    `);
    sessionManager = new SessionManager(db);
  });

  describe('createOrGetSession()', () => {
    it('TC-3.1-001: should create new session when rootId is empty', async () => {
      const session = await sessionManager.createOrGetSession('p2p_123');
      expect(session.p2pId).toBe('p2p_123');
      expect(session.threadId).toBeDefined();
      expect(session.messageCount).toBe(0);
    });

    it('TC-3.1-001b: should return existing session when threadId exists', async () => {
      const session1 = await sessionManager.createOrGetSession('p2p_123', 'thread_abc');
      const session2 = await sessionManager.createOrGetSession('p2p_123', 'thread_abc');
      expect(session1.id).toBe(session2.id);
    });

    it('TC-3.1-003: should throw error when parentId exists but thread does not', async () => {
      await expect(
        sessionManager.createOrGetSession('p2p_123', 'nonexistent', 'parent_123')
      ).rejects.toThrow('Thread不存在');
    });
  });

  describe('updateSessionMessage()', () => {
    it('TC-3.1-004: should increment message count', async () => {
      const session = await sessionManager.createOrGetSession('p2p_123');
      sessionManager.updateSessionMessage(session.id, 1);
      
      const updated = sessionManager.getSessionByThreadId(session.threadId);
      expect(updated?.messageCount).toBe(1);
    });
  });
});
```

**Must NOT do**:
- 不要mock数据库，使用真实SQLite

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Blocks**: Task 4 (verification)

**References**:
- `tests/message-handler.test.ts` - 测试模式参考
- `src/core/config-store.ts:215-250` - 需要添加updateSessionMessage方法

**Acceptance Criteria**:
- [ ] TC-3.1-001: 创建新Session测试通过
- [ ] TC-3.1-002: 获取已存在Session测试通过
- [ ] TC-3.1-003: parentId存在但Thread不存在抛出Error
- [ ] TC-3.1-004: 更新消息计数测试通过

---

#### Task 4: 验证与修复

**What to do**:
1. 运行 `npm test -- --run`
2. 如果有失败，修复问题
3. 确保所有测试通过

**Must NOT do**: 无

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: NO
- **Blocks**: Task 5 (commit)

**References**:
- `tests/session-manager.test.ts` - 测试文件位置

**Acceptance Criteria**:
- [ ] `npm test -- --run` 全部通过
- [ ] 无TypeScript错误

---

#### Task 5: 提交代码

**What to do**:
```bash
git add src/core/session-manager.ts tests/session-manager.test.ts
git commit -m "Sprint 3.1: Session会话管理模块

- 实现SessionManager类
- 支持createOrGetSession
- 支持getSessionByThreadId
- 支持updateSessionMessage
- 添加单元测试

Co-Authored-By: AI <ai@example.com>"
```

**Must NOT do**: 无

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: NO

**References**: 无

**Acceptance Criteria**:
- [ ] Commit成功
- [ ] Push成功（如需要）

---

## Final Verification Wave

### 验收标准检查

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 新Session创建 | root_id为空时创建新Session | TC-3.1-001单元测试 |
| 已存在Session获取 | root_id已存在时返回已有Session | TC-3.1-002单元测试 |
| Thread不存在错误 | parentId存在但Thread不存在时抛出Error | TC-3.1-003边界测试 |
| 消息计数更新 | messageCount递增 | TC-3.1-004单元测试 |
| Session持久化 | Session保存到SQLite | 集成测试 |

---

## Success Criteria

### Verification Commands
```bash
npm test -- --run  # 全部通过
```

### Final Checklist
- [ ] SessionManager类实现完整
- [ ] 所有4个测试用例通过
- [ ] 无TypeScript编译错误
- [ ] 代码已commit
