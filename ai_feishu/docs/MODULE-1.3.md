# Module 1.3: 飞书应用创建与配置

**Sprint**: Sprint 1 - 基础设施建设
**状态**: ✅ 完成
**日期**: 2026-04-11

---

## 概述

本模块完成了飞书应用的 SDK 客户端配置，为后续接收和发送飞书消息奠定基础。

## 文件结构

```
src/feishu/
└── client.ts     # 飞书 SDK 客户端封装
```

## API

### `createFeishuClient(config?)`

创建飞书 SDK 客户端实例。

```typescript
import { createFeishuClient } from './feishu/client';

// 从环境变量读取
const client = createFeishuClient();

// 或传入配置
const client = createFeishuClient({
  appId: 'cli_xxx',
  appSecret: 'xxx',
  botName: 'AI_Feishu'
});
```

### `getFeishuClient()`

获取单例客户端实例。

```typescript
import { getFeishuClient } from './feishu/client';
const client = getFeishuClient();
```

### `getFeishuBotName()`

获取配置的机器人名称。

```typescript
import { getFeishuBotName } from './feishu/client';
const name = getFeishuBotName(); // 'AI_Feishu'
```

### `isFeishuConfigured()`

检查飞书凭证是否已配置。

```typescript
import { isFeishuConfigured } from './feishu/client';
if (isFeishuConfigured()) {
  // 可以使用飞书功能
}
```

### `getFeishuConfig()`

获取飞书配置（不含 secrets）。

```typescript
import { getFeishuConfig } from './feishu/client';
const config = getFeishuConfig();
// { appId: 'cli_xxx', botName: 'AI_Feishu' }
```

## 飞书应用创建

### 创建步骤

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 添加「机器人」能力
5. 申请所需权限
6. 发布应用

### 所需权限

| 权限名称 | 权限标识 |
|---------|---------|
| 获取与编辑用户发送给机器人的单聊消息 | im:message:send_as_bot |
| 接收用户发给机器人的消息 | im:message:receive_v1 |
| 获取用户在群中的消息 | im:message.group:readonly |
| 获取与编辑云文档内容 | docx:document:readonly |
| 创建云文档 | docx:document:create |
| 获取云空间文件列表 | drive:drive:readonly |
| 获取文件夹列表 | drive:folder:readonly |

## 环境变量

```bash
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_BOT_NAME=AI_Feishu
```

## 验证

```bash
# TypeScript 检查
npm run typecheck

# 测试客户端创建
npx tsx -e "import { createFeishuClient } from './src/feishu/client'; console.log(createFeishuClient() ? 'OK' : 'FAIL')"
```

## 依赖

- `@larksuiteoapi/node-sdk` - 飞书 SDK

## 下一步

- Sprint 1 Module 1.4: 安全加固 (AES-256-GCM 加密)
- Sprint 2: 飞书消息通道（实现 WebSocket 长连接、消息接收发送）
