import { serve } from '@hono/node-server';
import { CallbackRouter } from './routers/callback';
import { MessageHandler } from './feishu/message-handler';
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';
import { createFeishuClient } from './feishu/client';

const PORT = parseInt(process.env.CALLBACK_PORT || '3000', 10);

const callbackRouter = new CallbackRouter();
const messageHandler = new MessageHandler();
let messageService: MessageService;

callbackRouter.onMessage(async (parsed) => {
  console.log(`[Server] Message received: ${parsed.messageId} from ${parsed.senderOpenId} in ${parsed.chatId}`);

  if (!messageService) {
    const client = createFeishuClient();
    messageService = new MessageService(client);
  }

  const welcomeCard = CardBuilder.sessionStarterCard([
    { label: 'GPT-4', value: 'gpt4' },
    { label: 'Claude 3', value: 'claude3' },
    { label: 'MiniMax', value: 'minimax' },
  ]);

  try {
    const msgId = await messageService.sendCardMessage(parsed.chatId, welcomeCard);
    console.log(`[Server] Sent welcome card: ${msgId}`);
  } catch (e) {
    console.error('[Server] Failed to send card:', e);
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