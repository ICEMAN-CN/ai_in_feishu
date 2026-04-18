import { FeishuWSManager } from '../src/core/ws-manager';
import { MessageHandler } from '../src/feishu/message-handler';

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
  console.error('FEISHU_APP_ID and FEISHU_APP_SECRET must be set');
  process.exit(1);
}

console.log('[Test] Starting Feishu WS integration test...');
console.log('[Test] App ID:', FEISHU_APP_ID);

const wsManager = new FeishuWSManager({
  appId: FEISHU_APP_ID,
  appSecret: FEISHU_APP_SECRET,
});

const messageHandler = new MessageHandler();

wsManager.registerHandler('im.message.receive_v1', async (data) => {
  console.log('[WS] Message received!');
  console.log('[WS] Raw data:', JSON.stringify(data, null, 2).slice(0, 500));

  const parsed = messageHandler.parseMessage(data);

  if (messageHandler.isDuplicate(parsed.messageId)) {
    console.log('[Handler] Duplicate message, skipping:', parsed.messageId);
    return;
  }

  console.log('[Handler] Parsed message:');
  console.log('  - messageId:', parsed.messageId);
  console.log('  - chatType:', parsed.chatType);
  console.log('  - messageType:', parsed.messageType);
  console.log('  - senderOpenId:', parsed.senderOpenId);
  console.log('  - senderType:', parsed.senderType);

  if (messageHandler.isTextMessage(parsed)) {
    const text = messageHandler.extractTextContent(parsed);
    console.log('  - text content:', text);
  }
});

console.log('[Test] Starting WebSocket connection...');
wsManager.start();

console.log('[Test] Waiting for messages...');
console.log('[Test] Press Ctrl+C to stop');
