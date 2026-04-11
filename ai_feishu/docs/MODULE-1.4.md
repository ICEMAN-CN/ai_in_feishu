# Module 1.4: 安全加固 (AES-256-GCM 加密)

**Sprint**: Sprint 1 - 基础设施建设
**状态**: ✅ 完成
**日期**: 2026-04-11

---

## 概述

本模块实现了 AES-256-GCM 加密模块，用于安全存储 API Keys 等敏感信息。

## 文件结构

```
src/core/
└── encryption.ts     # AES-256-GCM 加密模块
```

## 算法

- **加密算法**: AES-256-GCM
- **IV 长度**: 12 字节（96 位）
- **Auth Tag**: 16 字节（128 位）
- **密钥长度**: 32 字节（256 位）

## API

### `getEncryptionKey()`

从环境变量获取加密密钥。

```typescript
import { getEncryptionKey } from './core/encryption';
const key = getEncryptionKey(); // Buffer
```

**要求**: `ENCRYPTION_KEY` 环境变量必须是 64 位 hex 字符串（32 字节）

### `encrypt(plainText)`

加密明文。

```typescript
import { encrypt } from './core/encryption';
const encrypted = encrypt('my-api-key');
// {
//   ciphertext: 'base64...',
//   iv: 'base64...',
//   tag: 'base64...'
// }
```

### `decrypt(data)`

解密密文。

```typescript
import { decrypt } from './core/encryption';
const plain = decrypt(encrypted);
```

### `encryptForStorage(plainText)`

加密并返回 JSON 字符串格式（方便存储到数据库）。

```typescript
import { encryptForStorage } from './core/encryption';
const stored = encryptForStorage('my-api-key');
// '{"ciphertext":"...","iv":"...","tag":"..."}'
```

### `decryptFromStorage(encryptedStr)`

从存储格式解密。

```typescript
import { decryptFromStorage } from './core/encryption';
const plain = decryptFromStorage(stored);
```

### `isEncryptionConfigured()`

检查加密是否已配置。

```typescript
import { isEncryptionConfigured } from './core/encryption';
if (isEncryptionConfigured()) {
  // 可以使用加密功能
}
```

## 使用示例

### 在 config-store 中加密 API Key

```typescript
import { encryptForStorage, decryptFromStorage } from './core/encryption';
import { saveModel, getModel } from './core/config-store';

// 保存模型配置（加密 API Key）
const model = {
  id: 'model-1',
  name: 'GPT-4o',
  provider: 'openai',
  apiKeyEncrypted: encryptForStorage('sk-xxx'), // 加密存储
  baseUrl: 'https://api.openai.com/v1',
  // ...
};
saveModel(model);

// 读取模型配置（解密 API Key）
const saved = getModel('model-1');
const apiKey = decryptFromStorage(saved.apiKeyEncrypted);
```

## 环境变量

```bash
# 加密密钥（64 位 hex 字符串，32 字节）
# 生成方法: openssl rand -hex 32
ENCRYPTION_KEY=a1b2c3d4e5f6...（64位）
```

## 密钥生成

```bash
# 生成随机密钥
openssl rand -hex 32

# 示例输出
# 7c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6
```

## 安全特性

1. **随机 IV**: 每次加密使用不同的随机 IV，防止模式分析
2. **认证加密**: GCM 模式同时提供机密性和完整性
3. **Auth Tag**: 密文篡改检测

## 测试

```bash
# 设置密钥
export ENCRYPTION_KEY=$(openssl rand -hex 32)

# 测试加密/解密
npx tsx -e "
import { encrypt, decrypt, encryptForStorage, decryptFromStorage } from './src/core/encryption';

const text = 'test-message';
const encrypted = encrypt(text);
const decrypted = decrypt(encrypted);
console.log(decrypted === text ? '✅ PASS' : '❌ FAIL');
"
```

## 注意事项

1. **密钥丢失 = 数据丢失**: 没有密钥无法解密存储的数据
2. **密钥必须 64 位 hex**: 不符合格式将抛出错误
3. **建议使用强随机密钥**: 使用 `openssl rand -hex 32` 生成

## 下一步

- Sprint 2: 飞书消息通道（WebSocket 长连接、消息接收发送）
