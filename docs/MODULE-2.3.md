# Module 2.3: 消息去重与签名校验

**所属 Sprint**: Sprint 2 - 飞书消息通道  
**状态**: ✅ 已完成  
**文件**: `src/feishu/validator.ts`  
**测试**: `tests/validator.test.ts`

---

## 1. 模块概述

本模块提供消息签名校验和时间戳验证功能，确保消息来源可信。

## 2. 核心功能

| 方法 | 说明 |
|------|------|
| `verifyFeishuSignature(body, timestamp, signature)` | 验证飞书消息签名 |
| `isValidTimestamp(timestamp)` | 验证时间戳在5分钟内 |

## 3. 签名校验算法

```
signature = HMAC-SHA256(timestamp + body, VERIFICATION_TOKEN)
```

### 校验流程

1. 如果未配置 `FEISHU_VERIFICATION_TOKEN`，直接返回 `true`
2. 计算期望的签名：`HMAC-SHA256(timestamp + body, token)`
3. 使用 `timingSafeEqual` 比较签名（防止时序攻击）
4. 返回比较结果

## 4. 安全特性

| 特性 | 说明 |
|------|------|
| `timingSafeEqual` | 防止时序攻击（Timing Attack） |
| 环境变量配置 | Token 不硬编码，支持热更新 |
| 5分钟时间窗口 | 防止重放攻击 |

## 5. 使用方式

```typescript
import { verifyFeishuSignature, isValidTimestamp } from './feishu/validator';

// 在回调处理中
callback.post('/feishu', async (c) => {
  const body = await c.req.text();
  const timestamp = c.req.header('X-Lark-Request-Timestamp') || '';
  const signature = c.req.header('X-Lark-Request-Signature') || '';

  // 1. 验证时间戳（5分钟窗口）
  if (!isValidTimestamp(timestamp)) {
    return c.json({ code: 401, msg: 'Timestamp expired' }, 401);
  }

  // 2. 验证签名
  if (!verifyFeishuSignature(body, timestamp, signature)) {
    return c.json({ code: 401, msg: 'Invalid signature' }, 401);
  }

  // 处理消息...
});
```

## 6. 测试覆盖

### verifyFeishuSignature

| 测试场景 | 状态 |
|---------|------|
| Token未配置时返回true | ✅ |
| 正确签名返回true | ✅ |
| 错误签名返回false | ✅ |
| 篡改body返回false | ✅ |
| 篡改timestamp返回false | ✅ |
| 畸形签名返回false | ✅ |
| 空签名返回false | ✅ |

### isValidTimestamp

| 测试场景 | 状态 |
|---------|------|
| 当前时间戳有效 | ✅ |
| 4分钟内有效 | ✅ |
| 超过5分钟无效 | ✅ |
| 未来超过5分钟无效 | ✅ |
| 边界值测试(299s)有效 | ✅ |
| 边界值测试(300s)无效 | ✅ |
| 非数字时间戳无效 | ✅ |

**总测试数**: 15

## 7. 联调评估

**结论**: 无需联调测试

**原因**: 
- 签名校验是纯函数逻辑
- 不依赖外部系统或网络
- HMAC计算确定性高
- 单元测试覆盖全面

## 8. 相关文档

- Sprint 2 规划: `docs/sprints/Sprint-02-飞书消息通道.md`
- Module 2.2: `docs/MODULE-2.2.md`
