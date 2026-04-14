import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { CallbackRouter, CardAction } from './routers/callback';
import adminRouter from './routers/admin';
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';
import { createFeishuClient } from './feishu/client';
import {
  ACTION_ARCHIVE_FULL,
  ACTION_ARCHIVE_SUMMARY,
  ACTION_ARCHIVE_CANCEL,
} from './constants/action-ids';

const PORT = parseInt(process.env.CALLBACK_PORT || '3000', 10);

const app = new Hono();
const callbackRouter = new CallbackRouter();
let messageService: MessageService;

app.route('/feishu', callbackRouter.getApp());
app.route('/api/admin', adminRouter);

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

function getMessageService(): MessageService {
  if (!messageService) {
    const client = createFeishuClient();
    messageService = new MessageService(client);
  }
  return messageService;
}

callbackRouter.onMessage(async (parsed) => {
  console.log(`[Server] Message received: ${parsed.messageId} from ${parsed.senderOpenId} in ${parsed.chatId}`);

  const welcomeCard = CardBuilder.sessionStarterCard([
    { label: 'GPT-4', value: 'gpt4' },
    { label: 'Claude 3', value: 'claude3' },
    { label: 'MiniMax', value: 'minimax' },
  ]);

  try {
    const msgId = await getMessageService().sendCardMessage(parsed.chatId, welcomeCard);
    console.log(`[Server] Sent welcome card: ${msgId}`);
  } catch (e) {
    console.error('[Server] Failed to send card:', e);
  }
});

callbackRouter.onCardAction(async (action: CardAction) => {
  console.log(`[Server] Card action: ${action.actionId} from ${action.openId} in ${action.chatId}`);

  try {
    if (action.actionId === ACTION_ARCHIVE_FULL) {
      console.log('[Server] 用户点击了"完整归档"');
      const responseCard = CardBuilder.new()
        .header('✅ 归档完成', 'green')
        .div('对话已完整归档到飞书文档')
        .build();
      await getMessageService().sendCardMessage(action.chatId, responseCard);
      console.log('[Server] 归档确认消息已发送');
    } else if (action.actionId === ACTION_ARCHIVE_SUMMARY) {
      console.log('[Server] 用户点击了"摘要归档"');
    } else if (action.actionId === ACTION_ARCHIVE_CANCEL) {
      console.log('[Server] 用户取消了归档');
    }
  } catch (e) {
    console.error('[Server] Failed to handle card action:', e);
  }
});

console.log(`🚀 Starting server on port ${PORT}...`);
console.log(`📡 POST http://localhost:${PORT}/feishu`);
console.log(`💚 GET  http://localhost:${PORT}/health`);
console.log(`🔧 GET  http://localhost:${PORT}/api/admin/models`);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`✅ Server running at http://localhost:${PORT}`);