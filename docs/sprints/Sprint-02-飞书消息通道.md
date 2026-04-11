# Sprint 2: 飞书消息通道

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint周期**: 1周  
**前置依赖**: Sprint 1 基础设施  
**Sprint目标**: 完成飞书WebSocket长连接、消息接收与发送  

---

## 1. 模块划分

### 模块 2.1: WebSocket长连接管理
### 模块 2.2: 消息接收与解析
### 模块 2.3: 消息去重与签名校验
### 模块 2.4: 消息发送与卡片构建
### 模块 2.5: 飞书回调API

---

## 2. 模块详细规格

### 模块 2.1: WebSocket长连接管理

**文件路径**: `src/core/ws-manager.ts`

#### 2.1.1 WebSocket管理器实现

```typescript
import { Client, JLPT, WebSocketClient, EventDispatcher } from '@larksuiteoapi/node-sdk';

export interface WSConfig {
  appId: string;
  appSecret: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WSManager {
  start(): Promise<void>;
  stop(): void;
  isConnected(): boolean;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

export class FeishuWSManager implements WSManager {
  private client: Client;
  private wsClient: WebSocketClient;
  private dispatcher: EventDispatcher;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private config: Required<WSConfig>;
  private handlers: Map<string, Set<Function>> = new Map();

  constructor(config: WSConfig) {
    this.config = {
      appId: config.appId,
      appSecret: config.appSecret,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
    };

    this.client = new Client({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      loggerLevel: JLPT.INFO,
    });

    this.wsClient = new WebSocketClient(this.client);
    this.dispatcher = new EventDispatcher({});
  }

  async start(): Promise<void> {
    try {
      await this.wsClient.start();
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', {});
      console.log('[WS] WebSocket connected successfully');
    } catch (error) {
      this.handleConnectionError(error);
      throw error;
    }
  }

  stop(): void {
    this.connected = false;
    this.wsClient.stop();
    this.emit('disconnected', {});
    console.log('[WS] WebSocket stopped');
  }

  isConnected(): boolean {
    return this.connected;
  }

  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any): void {
    this.handlers.get(event)?.forEach(handler => handler(data));
  }

  private handleConnectionError(error: any): void {
    this.connected = false;
    const errorCode = error?.code || error?.response?.status;
    
    console.error(`[WS] Connection error: ${errorCode}`, error);

    switch (errorCode) {
      case 401:
        // 刷新凭证重试
        console.log('[WS] Refreshing credentials...');
        this.reconnectAttempts++;
        setTimeout(() => this.start(), 1000);
        break;
      
      case 403:
        // 权限错误，终止并告警
        console.error('[WS] Permission denied. Please check app permissions.');
        this.emit('error', { type: 'PERMISSION_DENIED', error });
        break;
      
      case 429:
        // 限流，指数退避重试
        const backoff = Math.min(
          this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
          60000
        );
        console.log(`[WS] Rate limited. Retrying in ${backoff}ms...`);
        this.reconnectAttempts++;
        setTimeout(() => this.start(), backoff);
        break;
      
      default:
        // 网络错误，标准重连流程
        this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WS] Max reconnection attempts reached. Giving up.');
      this.emit('error', { type: 'MAX_RECONNECT_EXCEEDED' });
      return;
    }

    const backoff = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      60000
    );

    console.log(`[WS] Reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})...`);
    this.reconnectAttempts++;

    setTimeout(async () => {
      try {
        await this.start();
      } catch (error) {
        this.handleConnectionError(error);
      }
    }, backoff);
  }
}
```

#### 2.1.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 连接建立 | WebSocket成功连接到飞书服务器 | 日志显示 "connected successfully" |
| 连接状态 | isConnected() 返回正确状态 | 单元测试 |
| 断线重连 | 断开后自动重连 | 网络模拟测试 |
| 指数退避 | 重连间隔符合指数退避策略 | 日志时间戳验证 |
| 最大重试 | 超过10次后停止并告警 | 日志验证 |

#### 2.1.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-2.1-001 | 启动WS Manager | 连接成功，connected=true | 单元测试 |
| TC-2.1-002 | 断开后重连 | 自动重连成功 | mock网络测试 |
| TC-2.1-003 | 401错误处理 | 刷新凭证后重试 | mock测试 |
| TC-2.1-004 | 429限流 | 指数退避等待重试 | mock测试 |
| TC-2.1-005 | 达到最大重试 | 停止重连，触发告警事件 | mock测试 |

---

### 模块 2.2: 消息接收与解析

**文件路径**: `src/feishu/message-handler.ts`, `src/types/message.ts`

#### 2.2.1 消息类型定义 (src/types/message.ts)

```typescript
export interface FeishuMessageHeader {
  event_id: string;
  event_type: 'im.message.receive_v1';
  create_time: string;
  token: string;
  app_id: string;
  tenant_key: string;
}

export interface FeishuMessageSender {
  sender_id: { open_id: string };
  sender_type: 'user' | 'bot';
}

export interface FeishuMessage {
  message_id: string;
  root_id: string;       // Thread根消息ID
  parent_id: string;     // 父消息ID（空表示这是根消息）
  create_time: string;
  chat_id: string;
  chat_type: 'p2p' | 'group';
  message_type: 'text' | 'post' | 'interactive';
  content: string;       // JSON string
}

export interface FeishuMessageEvent {
  header: FeishuMessageHeader;
  event: {
    sender: FeishuMessageSender;
    receiver: { receiver_id: { open_id: string }; receiver_type: 'user' | 'bot' };
    message: FeishuMessage;
  };
}

export interface ParsedMessage {
  eventId: string;
  messageId: string;
  rootId: string;
  parentId: string;
  chatId: string;
  chatType: 'p2p' | 'group';
  messageType: 'text' | 'post' | 'interactive';
  content: any;
  senderOpenId: string;
  senderType: 'user' | 'bot';
  timestamp: string;
}
```

#### 2.2.2 消息处理器 (src/feishu/message-handler.ts)

```typescript
import { FeishuMessageEvent, ParsedMessage } from '../types/message';

export class MessageHandler {
  private processedMessageIds: Set<string> = new Set();
  
  parseMessage(event: FeishuMessageEvent): ParsedMessage {
    const { header, event: eventBody } = event;
    const { message, sender } = eventBody;

    let content: any;
    try {
      content = JSON.parse(message.content);
    } catch {
      content = { text: message.content };
    }

    return {
      eventId: header.event_id,
      messageId: message.message_id,
      rootId: message.root_id || message.message_id,  // root_id为空时使用message_id
      parentId: message.parent_id || '',
      chatId: message.chat_id,
      chatType: message.chat_type,
      messageType: message.message_type,
      content,
      senderOpenId: sender.sender_id.open_id,
      senderType: sender.sender_type,
      timestamp: header.create_time,
    };
  }

  isDuplicate(messageId: string): boolean {
    if (this.processedMessageIds.has(messageId)) {
      return true;
    }
    this.processedMessageIds.add(messageId);
    
    // 保留最近10000个消息ID，防止内存无限增长
    if (this.processedMessageIds.size > 10000) {
      const iterator = this.processedMessageIds.values();
      for (let i = 0; i < 5000; i++) {
        this.processedMessageIds.delete(iterator.next().value);
      }
    }
    
    return false;
  }

  isTextMessage(parsed: ParsedMessage): boolean {
    return parsed.messageType === 'text';
  }

  isInteractiveMessage(parsed: ParsedMessage): boolean {
    return parsed.messageType === 'interactive';
  }

  extractTextContent(parsed: ParsedMessage): string {
    if (parsed.messageType === 'text') {
      return parsed.content.text || '';
    }
    return '';
  }
}
```

#### 2.2.3 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 消息解析 | 飞书事件能正确解析为ParsedMessage | 单元测试 |
| 根消息ID | root_id为空时使用message_id作为根ID | 边界测试 |
| 内容解析 | JSON格式content能正确解析 | 单元测试 |
| 消息去重 | 同一message_id第二次不处理 | 单元测试 |
| 去重内存 | 去重集合超过10000时自动清理 | 内存测试 |

#### 2.2.4 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-2.2-001 | 解析文本消息事件 | ParsedMessage各字段正确 | 单元测试 |
| TC-2.2-002 | 解析卡片消息事件 | ParsedMessage包含卡片内容 | 单元测试 |
| TC-2.2-003 | root_id为空 | 使用message_id作为root_id | 边界测试 |
| TC-2.2-004 | 第一次收到消息 | isDuplicate返回false | 单元测试 |
| TC-2.2-005 | 第二次收到同一消息 | isDuplicate返回true | 单元测试 |

---

### 模块 2.3: 消息去重与签名校验

**文件路径**: `src/feishu/validator.ts`

#### 2.3.1 签名校验

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

const FEISHU_VERIFICATION_TOKEN = process.env.FEISHU_VERIFICATION_TOKEN;

export function verifyFeishuSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  // 如果未配置Token，跳过校验
  if (!FEISHU_VERIFICATION_TOKEN) {
    return true;
  }

  const str = timestamp + body;
  const expectedSig = createHmac('sha256', FEISHU_VERIFICATION_TOKEN)
    .update(str)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch {
    return false;
  }
}

export function isValidTimestamp(timestamp: string): boolean {
  const now = Date.now();
  const ts = parseInt(timestamp) * 1000;  // 秒转毫秒
  
  // 允许5分钟内的timestamp
  const diff = Math.abs(now - ts);
  return diff < 5 * 60 * 1000;
}
```

#### 2.3.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 签名正确 | 正确签名通过校验 | 单元测试 |
| 签名错误 | 错误签名拒绝 | 安全测试 |
| Token未配置 | 跳过校验直接通过 | 配置测试 |
| Timestamp过期 | 5分钟外timestamp拒绝 | 边界测试 |

#### 2.3.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-2.3-001 | 正确签名 | verify返回true | 单元测试 |
| TC-2.3-002 | 错误签名 | verify返回false | 安全测试 |
| TC-2.3-003 | Token未配置 | verify返回true | 配置测试 |
| TC-2.3-004 | 时间戳已过期 | isValid返回false | 边界测试 |

---

### 模块 2.4: 消息发送与卡片构建

**文件路径**: `src/feishu/card-builder.ts`

#### 2.4.1 卡片构建器

```typescript
import { Client } from '@larksuiteoapi/node-sdk';

export interface CardElement {
  tag: string;
  [key: string]: any;
}

export interface CardAction {
  tag: 'button' | 'select_static' | 'overflow';
  text?: { tag: 'plain_text'; content: string };
  placeholder?: { tag: 'plain_text'; content: string };
  options?: Array<{ label: string; value: string }>;
  actions?: CardAction[];
  type?: string;
  url?: string;
  action_id?: string;
  [key: string]: any;
}

export class CardBuilder {
  private elements: CardElement[] = [];

  static new(): CardBuilder {
    return new CardBuilder();
  }

  header(title: string, template: 'blue' | 'grey' | 'green' | 'orange' | 'red' | 'purple' = 'blue'): this {
    this.elements.unshift({
      tag: 'card',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: title,
          },
          template,
        },
        elements: [],
      },
    });
    return this;
  }

  div(content: string): this {
    this.elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content,
      },
    });
    return this;
  }

  button(text: string, actionId: string, type: 'primary' | 'default' = 'default', url?: string): this {
    const action: CardAction = {
      tag: 'button',
      text: {
        tag: 'plain_text',
        content: text,
      },
      type,
      action_id: actionId,
    };
    if (url) {
      action.url = url;
    }
    this.elements.push({
      tag: 'action',
      actions: [action],
    });
    return this;
  }

  selectStatic(placeholder: string, options: Array<{ label: string; value: string }>, actionId: string): this {
    this.elements.push({
      tag: 'action',
      actions: [{
        tag: 'select_static',
        placeholder: {
          tag: 'plain_text',
          content: placeholder,
        },
        options,
        action_id: actionId,
      }],
    });
    return this;
  }

  hr(): this {
    this.elements.push({ tag: 'hr' });
    return this;
  }

  build(): object {
    if (this.elements.length === 0) {
      return { schema: '2.0', card: { elements: [] } };
    }

    // 找到card元素
    const cardElement = this.elements.find(e => e.tag === 'card');
    if (cardElement && cardElement.card) {
      // 把其他elements加入card的elements
      const nonCardElements = this.elements.filter(e => e !== cardElement);
      cardElement.card.elements = nonCardElements;
    }

    return {
      schema: '2.0',
      card: cardElement?.card || { elements: this.elements },
    };
  }

  // 特定卡片：会话启动卡片
  static sessionStarterCard(modelOptions: Array<{ label: string; value: string }>): object {
    return {
      schema: '2.0',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '🆕 新建 AI 对话',
          },
          template: 'blue',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: '选择一个AI引擎开始对话',
            },
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'select_static',
                placeholder: {
                  tag: 'plain_text',
                  content: '选择 AI 引擎',
                },
                options: modelOptions,
                action_id: 'model_select',
              },
            ],
          },
          { tag: 'hr' },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '🚀 开始对话',
                },
                type: 'primary',
                action_id: 'start_conversation',
              },
            ],
          },
        ],
      },
    };
  }

  // 流式响应卡片
  static streamingCard(modelName: string, initialContent: string = '正在思考...'): object {
    return {
      schema: '2.0',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: `🤖 ${modelName}`,
          },
          template: 'grey',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: initialContent,
            },
            id: 'response_content',
          },
          { tag: 'hr', id: 'divider' },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: '流式输出中...',
              },
            ],
          },
        ],
      },
    };
  }

  // 归档确认卡片
  static archiveConfirmCard(): object {
    return {
      schema: '2.0',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '💾 归档确认',
          },
          template: 'green',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: '是否将当前对话归档为飞书文档？',
            },
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '📄 完整归档' },
                type: 'primary',
                action_id: 'archive_full',
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '📝 摘要归档' },
                action_id: 'archive_summary',
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '📋 行动项归档' },
                action_id: 'archive_action_items',
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '❌ 取消' },
                action_id: 'archive_cancel',
              },
            ],
          },
        ],
      },
    };
  }
}
```

#### 2.4.2 消息发送服务

```typescript
import { Client } from '@larksuiteoapi/node-sdk';

export class MessageService {
  constructor(private client: Client) {}

  async sendTextMessage(chatId: string, content: string): Promise<string> {
    const response = await this.client.im.v1.message.create({
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text: content }),
      },
    });
    return response.data.message_id;
  }

  async sendCardMessage(chatId: string, card: object): Promise<string> {
    const response = await this.client.im.v1.message.create({
      data: {
        receive_id: chatId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      },
    });
    return response.data.message_id;
  }

  async updateCardMessage(messageId: string, card: object): Promise<void> {
    await this.client.im.v1.message.update({
      path: { message_id: messageId },
      data: {
        msg_type: 'interactive',
        content: JSON.stringify(card),
      },
    });
  }
}
```

#### 2.4.3 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 文本消息 | 能发送Markdown格式文本 | 飞书客户端验证 |
| 卡片消息 | 卡片格式符合飞书官方标准 | 卡片渲染测试 |
| 流式更新 | 能更新已有卡片内容 | 手动测试 |
| 会话启动卡片 | 模型下拉选项动态加载 | 手动测试 |

#### 2.4.4 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-2.4-001 | 发送文本消息 | 消息成功发送到飞书 | mock测试 |
| TC-2.4-002 | 发送卡片消息 | 卡片正确渲染 | 手动测试 |
| TC-2.4-003 | 更新卡片消息 | 卡片内容更新 | 手动测试 |
| TC-2.4-004 | 构建会话启动卡片 | 卡片结构正确 | 单元测试 |

---

### 模块 2.5: 飞书回调API

**文件路径**: `src/routers/callback.ts`

#### 2.5.1 回调路由实现

```typescript
import { Hono } from 'hono';
import { FeishuWSManager } from '../core/ws-manager';
import { MessageHandler } from '../feishu/message-handler';
import { verifyFeishuSignature } from '../feishu/validator';
import { FeishuMessageEvent } from '../types/message';

const callback = new Hono();

let wsManager: FeishuWSManager;
let messageHandler: MessageHandler;

export function initCallbackRouter(ws: FeishuWSManager, handler: MessageHandler) {
  wsManager = ws;
  messageHandler = handler;
}

callback.post('/feishu', async (c) => {
  const body = await c.req.text();
  const timestamp = c.req.header('X-Lark-Request-Timestamp') || '';
  const signature = c.req.header('X-Lark-Request-Signature') || '';

  // 签名校验
  if (!verifyFeishuSignature(body, timestamp, signature)) {
    console.warn('[Callback] Invalid signature');
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  let event: FeishuMessageEvent;
  try {
    event = JSON.parse(body);
  } catch (error) {
    console.error('[Callback] Failed to parse event:', error);
    return c.json({ code: 400, msg: 'Bad Request' }, 400);
  }

  // 跳过非消息接收事件
  if (event.header.event_type !== 'im.message.receive_v1') {
    return c.json({ code: 0, msg: 'success' });
  }

  // 解析消息
  const parsed = messageHandler.parseMessage(event);

  // 跳过机器人自己发送的消息
  if (parsed.senderType === 'bot') {
    return c.json({ code: 0, msg: 'success' });
  }

  // 去重检查
  if (messageHandler.isDuplicate(parsed.messageId)) {
    console.log(`[Callback] Duplicate message: ${parsed.messageId}`);
    return c.json({ code: 0, msg: 'success' });
  }

  // 触发消息事件
  wsManager.emit('message', parsed);

  return c.json({ code: 0, msg: 'success' });
});

export default callback;
```

#### 2.5.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 回调接收 | POST /callback/feishu能接收请求 | curl测试 |
| 签名校验 | 非法签名返回401 | 安全测试 |
| 消息解析 | 正确解析并触发message事件 | 单元测试 |
| 去重拦截 | 重复消息不触发事件 | 单元测试 |

#### 2.5.3 测试用例

| 测试编号 | 测试场景 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| TC-2.5-001 | POST正确签名 | 返回code:0 | curl测试 |
| TC-2.5-002 | POST错误签名 | 返回401 | curl测试 |
| TC-2.5-003 | POST机器人消息 | 跳过处理 | 边界测试 |
| TC-2.5-004 | POST重复消息 | 不触发message事件 | mock测试 |

---

## 3. 开发流程

### Phase 1: 模块实现

每个模块完成后进行 **Commit 1**:

```bash
git add .
git commit -m "Sprint 2: 完成 [模块名称] 模块

- 实现功能点A
- 实现功能点B

Co-Authored-By: AI <ai@example.com>"
```

### Phase 2: 单元测试 + Bug修复

完成单元测试，发现并修复问题，然后进行 **Commit 2**:

```bash
git add .
git commit -m "Sprint 2: [模块名称] 单元测试与Bug修复

- 添加单元测试X个
- 修复问题Y

Co-Authored-By: AI <ai@example.com>"
```

### Phase 3: 编写模块文档

编写该模块的README或JSDoc，完成后进行 **Commit 3**:

```bash
git add .
git commit -m "Sprint 2: [模块名称] 文档完善

- 添加API文档
- 添加使用示例

Co-Authored-By: AI <ai@example.com>"
```

---

## 4. Sprint 2 完成标准

### 模块验收清单

| 模块 | 验收状态 | 完成标准 |
|-----|---------|---------|
| 2.1 WebSocket长连接 | [ ] | WS连接稳定，断线重连正常 |
| 2.2 消息接收与解析 | [ ] | 能正确解析飞书消息事件 |
| 2.3 去重与签名校验 | [ ] | 去重有效，签名校验正确 |
| 2.4 消息发送与卡片 | [ ] | 能发送文本和卡片消息 |
| 2.5 回调API | [ ] | 回调接口能正常接收消息 |

### Sprint交付物

- WebSocket管理器，支持断线重连
- 消息处理器，支持去重
- 卡片构建器，符合飞书官方格式
- 回调API接口

### Sprint验证

```bash
# 1. 启动服务
npm run dev

# 2. 验证回调接口
curl -X POST http://localhost:3000/api/callback/feishu \
  -H "Content-Type: application/json" \
  -d '{"header":{"event_type":"im.message.receive_v1"},"event":{"message":{"message_id":"test","content":"{}"}}}'

# 3. 在飞书中添加机器人，发送消息
# 4. 验证机器人能收到并处理消息
```

---

## 5. Sprint间依赖

**依赖Sprint 2的模块**: Sprint 3 (模型路由), Sprint 6 (Tool Calling)  
**被Sprint 2依赖**: Sprint 1 (基础设施)

---

**文档版本**: v1.0  
**制定日期**: 2026-04-11  
**依据文档**: ai_feishu-PRD-正式版 v1.1
