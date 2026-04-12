import { serve } from '@hono/node-server';
import { CallbackRouter, CardAction } from './routers/callback';
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';
import { createFeishuClient } from './feishu/client';

const PORT = parseInt(process.env.CALLBACK_PORT || '3000', 10);

const callbackRouter = new CallbackRouter();
let messageService: MessageService;

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

  if (action.actionId === 'archive_full') {
    console.log('[Server] 用户点击了"完整归档"');
    const responseCard = CardBuilder.new()
      .header('✅ 归档完成', 'green')
      .div('对话已完整归档到飞书文档')
      .build();
    try {
      await getMessageService().sendCardMessage(action.chatId, responseCard);
      console.log('[Server] 归档确认消息已发送');
    } catch (e) {
      console.error('[Server] Failed to send archive confirmation:', e);
    }
  } else if (action.actionId === 'archive_summary') {
    console.log('[Server] 用户点击了"摘要归档"');
  } else if (action.actionId === 'archive_cancel') {
    console.log('[Server] 用户取消了归档');
  }
});

console.log(`🚀 Starting callback server on port ${PORT}...`);
console.log(`📡 POST http://localhost:${PORT}/callback/feishu`);
console.log(`💚 GET  http://localhost:${PORT}/callback/health`);

serve({
  fetch: callbackRouter.getApp().fetch,
  port: PORT,
});

console.log(`✅ Server running at http://localhost:${PORT}`);