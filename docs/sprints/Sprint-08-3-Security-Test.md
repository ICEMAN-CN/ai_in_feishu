# Sprint 8.3: 安全测试 (Security Testing)

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库
**Sprint周期**: 1天
**前置依赖**: Sprint 8.1, 8.2 完成
**Sprint目标**: 验证系统安全措施有效性

---

## 1. 测试场景矩阵

| 测试编号 | 测试场景 | 输入 | 预期输出 | 测试方法 |
|---------|---------|------|---------|---------|
| SEC-001 | API Key加密 | 查看数据库 | Key为密文 | 数据库查看 |
| SEC-002 | 签名校验开启 | 非法签名消息 | 返回false，reject | 安全测试 |
| SEC-003 | 签名校验关闭 | Token未配置 | 返回false (安全强制) | 配置测试 |
| SEC-004 | SQL注入 | 用户名"' OR '1'='1" | 过滤或报错 | 自动化测试 |
| SEC-005 | XSS攻击 | 消息包含\<script> | 转义处理 | 自动化测试 |
| SEC-006 | 越权访问 | 用户A访问用户B数据 | 拒绝访问 | 权限测试 |
| SEC-007 | 权限开关 | 关闭写权限后AI尝试创建 | 返回权限不足 | 边界测试 |

---

## 2. 安全机制说明

### 2.1 API Key加密 (SEC-001)

**实现**: `src/core/encryption.ts`

使用 AES-256-GCM 加密算法:
- 12字节随机IV
- 16字节认证标签
- 32字节加密密钥 (来自 ENCRYPTION_KEY 环境变量)

**加密格式**:
```json
{
  "ciphertext": "base64编码密文",
  "iv": "base64编码IV",
  "tag": "base64编码认证标签"
}
```

### 2.2 签名校验 (SEC-002/003)

**实现**: `src/feishu/validator.ts`

- 使用 HMAC-SHA256
- timingSafeEqual 防止时序攻击
- 5分钟时间戳容差

### 2.3 SQL注入防护 (SEC-004)

**实现**: `src/core/config-store.ts`

所有查询使用参数化查询:
```typescript
db.prepare('SELECT * FROM models WHERE id = ?').get(id)
```

### 2.4 XSS防护 (SEC-005)

**说明**:
- 后端存储原始内容
- 前端渲染时由 React 自动转义
- 不使用 innerHTML 插入用户内容

### 2.5 权限控制 (SEC-006/007)

**实现**: `src/core/mcp-tool-auth.ts`

- 工具级别权限控制
- 会话隔离 (thread_id 唯一)

---

## 3. 测试文件说明

### 3.1 测试配置
- **文件**: `tests/security/config.ts`
- **功能**: 统一配置测试payload、阈值等

### 3.2 API Key加密测试
- **文件**: `tests/security/api-key-encryption.test.ts`
- **运行**: `npm test -- tests/security/api-key-encryption.test.ts --run`
- **覆盖**: SEC-001

### 3.3 签名验证测试
- **文件**: `tests/security/signature-verification.test.ts`
- **运行**: `npm test -- tests/security/signature-verification.test.ts --run`
- **覆盖**: SEC-002, SEC-003

### 3.4 SQL注入测试
- **文件**: `tests/security/sql-injection.test.ts`
- **运行**: `npm test -- tests/security/sql-injection.test.ts --run`
- **覆盖**: SEC-004

### 3.5 XSS防护测试
- **文件**: `tests/security/xss-prevention.test.ts`
- **运行**: `npm test -- tests/security/xss-prevention.test.ts --run`
- **覆盖**: SEC-005

### 3.6 权限控制测试
- **文件**: `tests/security/permission-control.test.ts`
- **运行**: `npm test -- tests/security/permission-control.test.ts --run`
- **覆盖**: SEC-006, SEC-007

---

## 4. 快速运行指南

### 4.1 安装依赖
```bash
cd ai_feishu
npm install --legacy-peer-deps
```

### 4.2 运行所有安全测试
```bash
npm test -- tests/security --run
```

### 4.3 运行单个安全测试
```bash
# SEC-001: API Key加密
npm test -- tests/security/api-key-encryption.test.ts --run

# SEC-002/003: 签名验证
npm test -- tests/security/signature-verification.test.ts --run

# SEC-004: SQL注入
npm test -- tests/security/sql-injection.test.ts --run

# SEC-005: XSS防护
npm test -- tests/security/xss-prevention.test.ts --run

# SEC-006/007: 权限控制
npm test -- tests/security/permission-control.test.ts --run
```

---

## 5. 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| API Key加密 | 数据库中为AES-256-GCM密文 | SEC-001测试 |
| 签名校验 | 非法签名被拒绝 | SEC-002测试 |
| SQL注入防护 | 注入被过滤或报错 | SEC-004测试 |
| XSS防护 | 特殊字符被转义 | SEC-005测试 |
| 权限校验 | 越权操作被拒绝 | SEC-006测试 |
| MCP权限开关 | 关闭后工具不可用 | SEC-007测试 |

---

## 6. 安全测试结果

### 6.1 SEC-001: API Key加密
- [ ] 加密后数据为JSON格式
- [ ] 包含ciphertext, iv, tag字段
- [ ] 明文key不出现在数据库

### 6.2 SEC-002: 签名校验
- [ ] 非法签名返回false
- [ ] 正确签名返回true
- [ ] 时序攻击防护

### 6.3 SEC-003: 签名关闭
- [ ] Token未配置时返回false

### 6.4 SEC-004: SQL注入
- [ ] 注入payload被安全处理
- [ ] 数据库结构完整

### 6.5 SEC-005: XSS防护
- [ ] 恶意脚本被检测
- [ ] 内容作为文本存储

### 6.6 SEC-006: 越权访问
- [ ] 会话隔离有效
- [ ] 跨用户访问被拒绝

### 6.7 SEC-007: 权限开关
- [ ] 禁用工具不可调用
- [ ] 启用工具可正常调用

---

## 7. 附录

### 7.1 相关文件路径
```
ai_feishu/
├── src/core/encryption.ts           # AES-256-GCM加密
├── src/feishu/validator.ts           # 签名验证
├── src/core/config-store.ts          # SQL注入防护
├── src/core/mcp-tool-auth.ts        # 权限控制
├── tests/security/
│   ├── config.ts                    # 测试配置
│   ├── api-key-encryption.test.ts   # SEC-001
│   ├── signature-verification.test.ts # SEC-002/003
│   ├── sql-injection.test.ts       # SEC-004
│   ├── xss-prevention.test.ts       # SEC-005
│   └── permission-control.test.ts   # SEC-006/007
└── docs/sprints/
    └── Sprint-08-3-Security-Test.md # 本文档
```

---

**文档版本**: v1.0
**制定日期**: 2026-04-16
**依据文档**: Sprint-08-集成测试与优化.md