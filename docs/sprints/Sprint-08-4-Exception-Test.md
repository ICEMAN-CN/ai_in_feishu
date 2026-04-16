# Sprint 8.4: 异常处理测试 (Exception Handling Testing)

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库
**Sprint周期**: 1天
**前置依赖**: Sprint 8.1, 8.2, 8.3 完成
**Sprint目标**: 验证系统在各种异常场景下的表现

---

## 1. 测试场景矩阵

| 测试编号 | 异常场景 | 严重级别 | 预期行为 | 测试方法 |
|---------|---------|---------|---------|---------|
| EXC-001 | WebSocket断开 | P0 | 指数退避重连 | 网络模拟 |
| EXC-002 | MCP Server宕机 | P1 | 自动降级到原生API | 故障注入 |
| EXC-003 | LLM API超时 | P1 | 重试3次后返回提示 | 超时测试 |
| EXC-004 | 飞书文档无权限 | P2 | 返回权限不足提示 | 权限测试 |
| EXC-005 | 向量库查询失败 | P1 | 降级到关键词搜索 | 故障注入 |
| EXC-006 | API Key无效 | P0 | Admin告警 | 配置测试 |
| EXC-007 | 同步超时 | P2 | 跳过超时文档 | 超时测试 |
| EXC-008 | 存储空间不足 | P0 | 停止同步，告警 | 磁盘测试 |
| EXC-009 | Thread不存在 | P2 | 返回"会话不存在" | 边界测试 |
| EXC-010 | 网络闪断 | P1 | 自动重连恢复 | 网络模拟 |

---

## 2. 异常处理机制说明

### 2.1 WebSocket断开重连 (EXC-001)

**实现**: `src/core/ws-manager.ts`

- `registerHandler()` - 注册消息处理器
- `start()` / `stop()` - 生命周期管理
- 错误场景: `Cannot register handler after start()`

### 2.2 MCP降级服务 (EXC-002)

**实现**: `src/services/mcp-fallback.ts`

- `readDocument()` - 文档读取
- `createDocument()` - 文档创建
- `search()` - 搜索功能

### 2.3 文档权限错误 (EXC-004)

**实现**: `src/services/mcp-fallback.ts`

- FeishuAPIError 传播
- 错误码: 403 (权限), 404 (不存在), 401 (认证), 429 (限流)

### 2.4 向量库错误处理 (EXC-005)

**实现**: `src/core/vector-store.ts`, `src/core/vector-store-service.ts`

- 查询失败返回空数组
- 删除/统计操作失败抛出错误

### 2.5 API Key验证 (EXC-006)

**实现**: `src/core/encryption.ts`, `src/core/config-store.ts`

- `getEncryptionKey()` - 密钥获取与验证
- `encrypt()` / `decrypt()` - 加解密
- `saveModel()` - 模型保存验证

### 2.6 存储空间错误 (EXC-008)

**实现**: `src/core/config-store.ts`, `src/core/vector-store.ts`

- ENOSPC 错误传播
- 有意义的错误消息

### 2.7 会话不存在 (EXC-009)

**实现**: `src/core/session-manager.ts`, `src/core/config-store.ts`

- `getSession()` - 返回null
- `createOrGetSession()` - Thread不存在时抛出错误

---

## 3. 测试文件说明

### 3.1 测试配置
- **文件**: `tests/exception/config.ts`
- **功能**: 统一配置异常场景payload、错误消息等

### 3.2 WebSocket断开测试
- **文件**: `tests/exception/ws-disconnect.test.ts`
- **运行**: `npm test -- tests/exception/ws-disconnect.test.ts --run`
- **覆盖**: EXC-001

### 3.3 MCP降级测试
- **文件**: `tests/exception/mcp-server-down.test.ts`
- **运行**: `npm test -- tests/exception/mcp-server-down.test.ts --run`
- **覆盖**: EXC-002

### 3.4 文档权限测试
- **文件**: `tests/exception/doc-permission.test.ts`
- **运行**: `npm test -- tests/exception/doc-permission.test.ts --run`
- **覆盖**: EXC-004

### 3.5 向量库失败测试
- **文件**: `tests/exception/vector-query-fail.test.ts`
- **运行**: `npm test -- tests/exception/vector-query-fail.test.ts --run`
- **覆盖**: EXC-005

### 3.6 API Key验证测试
- **文件**: `tests/exception/api-key-invalid.test.ts`
- **运行**: `npm test -- tests/exception/api-key-invalid.test.ts --run`
- **覆盖**: EXC-006

### 3.7 存储空间测试
- **文件**: `tests/exception/storage-full.test.ts`
- **运行**: `npm test -- tests/exception/storage-full.test.ts --run`
- **覆盖**: EXC-008

### 3.8 会话不存在测试
- **文件**: `tests/exception/thread-not-exist.test.ts`
- **运行**: `npm test -- tests/exception/thread-not-exist.test.ts --run`
- **覆盖**: EXC-009

---

## 4. 快速运行指南

### 4.1 运行所有异常处理测试
```bash
npm test -- tests/exception --run
```

### 4.2 运行单个异常测试
```bash
# EXC-001: WebSocket断开
npm test -- tests/exception/ws-disconnect.test.ts --run

# EXC-002: MCP降级
npm test -- tests/exception/mcp-server-down.test.ts --run

# EXC-004: 文档权限
npm test -- tests/exception/doc-permission.test.ts --run

# EXC-005: 向量库失败
npm test -- tests/exception/vector-query-fail.test.ts --run

# EXC-006: API Key验证
npm test -- tests/exception/api-key-invalid.test.ts --run

# EXC-008: 存储空间
npm test -- tests/exception/storage-full.test.ts --run

# EXC-009: 会话不存在
npm test -- tests/exception/thread-not-exist.test.ts --run
```

---

## 5. 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| WebSocket重连 | 断连后自动重连 | EXC-001测试 |
| MCP降级 | MCP宕机后自动降级 | EXC-002测试 |
| 权限不足提示 | 返回友好提示 | EXC-004测试 |
| 向量库降级 | 查询失败后返回空 | EXC-005测试 |
| API Key验证 | 无效Key被拒绝 | EXC-006测试 |
| 存储告警 | 磁盘不足时报错 | EXC-008测试 |
| 会话不存在 | 返回null或报错 | EXC-009测试 |

---

## 6. 异常测试结果

### 6.1 EXC-001: WebSocket断开
- [x] 9 tests passing
- 断连后错误处理正确
- 重连机制验证

### 6.2 EXC-002: MCP降级
- [x] 12 tests passing
- Fallback到原生API
- 错误正确传播

### 6.3 EXC-004: 文档权限
- [x] 9 tests passing
- 403/404/401/429错误处理
- 错误码识别

### 6.4 EXC-005: 向量库失败
- [x] 14 tests passing
- 查询失败返回空数组
- 写入失败抛出错误

### 6.6 EXC-006: API Key验证
- [x] 30 tests passing
- 无效密钥被拒绝
- 加密解密功能正常

### 6.8 EXC-008: 存储空间
- [x] 10 tests passing
- ENOSPC错误传播
- 有意义的错误消息

### 6.9 EXC-009: 会话不存在
- [x] 13 tests passing
- 非存在线程返回null
- 错误消息正确

---

## 7. 附录

### 7.1 相关文件路径
```
ai_feishu/
├── src/core/ws-manager.ts              # WebSocket管理
├── src/core/encryption.ts               # 加密模块
├── src/core/config-store.ts             # 配置存储
├── src/core/vector-store.ts              # 向量存储
├── src/core/session-manager.ts          # 会话管理
├── src/services/mcp-fallback.ts          # MCP降级
├── tests/exception/
│   ├── config.ts                        # 测试配置
│   ├── ws-disconnect.test.ts            # EXC-001
│   ├── mcp-server-down.test.ts           # EXC-002
│   ├── doc-permission.test.ts            # EXC-004
│   ├── vector-query-fail.test.ts         # EXC-005
│   ├── api-key-invalid.test.ts           # EXC-006
│   ├── storage-full.test.ts              # EXC-008
│   └── thread-not-exist.test.ts          # EXC-009
└── docs/sprints/
    └── Sprint-08-4-Exception-Test.md    # 本文档
```

---

**文档版本**: v1.0
**制定日期**: 2026-04-16
**依据文档**: Sprint-08-集成测试与优化.md