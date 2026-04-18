import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from './core/logger';
import { CallbackRouter } from './routers/callback';
import adminRouter from './routers/admin';
import { initKBRouter, initRAGRouter } from './routers/admin-kb';
import adminKb from './routers/admin-kb';
import { KBFolderManager } from './core/kb-folder-manager';
import { CardBuilder } from './feishu/card-builder';
import { MessageService } from './feishu/message-service';
import { MessageHandler } from './feishu/message-handler';
import { createFeishuClient } from './feishu/client';
import { getDb, getEnabledModels } from './core/config-store';
import { LLMRouter } from './services/llm-router';
import { SessionManager } from './core/session-manager';
import { StreamingHandler } from './services/streaming-handler';
import { FeishuDocService } from './services/feishu-doc';
import { ChunkingService } from './services/chunking';
import { EmbeddingService } from './services/embedding';
import { RAGPipeline } from './services/rag-pipeline';
import { VectorStoreService } from './core/vector-store-service';
import { ACTION_ARCHIVE_FULL, ACTION_ARCHIVE_SUMMARY, ACTION_ARCHIVE_CANCEL, } from './constants/action-ids';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = resolve(__dirname, '../dist');
const PORT = parseInt(process.env.CALLBACK_PORT || '3000', 10);
const app = new Hono();
const callbackRouter = new CallbackRouter();
const messageHandler = new MessageHandler();
app.route('/feishu', callbackRouter.getApp());
app.route('/api/admin', adminRouter);
app.get('/health', (c) => {
    const enabledModels = getEnabledModels();
    const defaultModel = enabledModels.find(m => m.isDefault);
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        wsConnected: false,
        mcpConnected: false,
        vectorDbStatus: 'ready',
        currentModel: defaultModel?.name || null,
    });
});
const db = getDb();
const llmRouter = new LLMRouter();
const sessionManager = new SessionManager(db);
const kbFolderManager = new KBFolderManager();
const feishuClient = createFeishuClient();
const feishuDocService = new FeishuDocService(feishuClient);
const chunkingService = new ChunkingService();
const embeddingService = new EmbeddingService();
const ragPipeline = new RAGPipeline(kbFolderManager, feishuDocService, chunkingService, embeddingService);
initKBRouter(kbFolderManager, ragPipeline);
initRAGRouter(ragPipeline, new VectorStoreService(), kbFolderManager);
app.route('/api/admin/kb', adminKb);
// /admin without trailing slash makes relative ./assets/*.js resolve to /assets/* (HTML → MIME error).
app.get('/admin', (c) => c.redirect('/admin/', 301));
// Serve static files from dist/admin for the admin console
app.use('/admin/*', serveStatic({ root: distPath, rewriteRequestPath: (path) => path }));
app.use('/admin', serveStatic({ root: distPath, rewriteRequestPath: () => '/admin/index.html' }));
// Catch-all route for SPA (must be last)
app.get('/*', serveStatic({ root: distPath, rewriteRequestPath: () => '/admin/index.html' }));
let messageService;
let streamingHandler;
function getMessageService() {
    if (!messageService) {
        const client = createFeishuClient();
        messageService = new MessageService(client);
    }
    return messageService;
}
function getStreamingHandler() {
    if (!streamingHandler) {
        streamingHandler = new StreamingHandler(llmRouter, sessionManager, getMessageService());
    }
    return streamingHandler;
}
callbackRouter.onMessage(async (parsed) => {
    logger.info('Server', `Message received: ${parsed.messageId} from ${parsed.senderOpenId} in ${parsed.chatId}`);
    if (parsed.messageType !== 'text') {
        logger.debug('Server', `Ignoring non-text message type: ${parsed.messageType}`);
        return;
    }
    const textContent = messageHandler.extractTextContent(parsed);
    if (!textContent) {
        logger.debug('Server', 'Empty text content, ignoring');
        return;
    }
    try {
        const session = await sessionManager.createOrGetSession(parsed.chatId, parsed.rootId, parsed.parentId);
        if (!session) {
            const enabledModels = getEnabledModels();
            const modelOptions = enabledModels.map((m) => ({
                label: m.name,
                value: m.id,
            }));
            if (modelOptions.length === 0) {
                const errorCard = CardBuilder.new()
                    .header('⚠️ 无可用模型', 'orange')
                    .div('当前没有启用的AI模型，请先在管理界面添加模型')
                    .build();
                await getMessageService().sendCardMessage(parsed.chatId, errorCard);
                return;
            }
            const welcomeCard = CardBuilder.sessionStarterCard(modelOptions);
            await getMessageService().sendCardMessage(parsed.chatId, welcomeCard);
            return;
        }
        await getStreamingHandler().handleUserMessage(parsed.chatId, parsed.rootId || parsed.messageId, textContent);
    }
    catch (e) {
        logger.error('Server', `Failed to handle message: ${e}`);
        const errorCard = CardBuilder.new()
            .header('❌ 错误', 'red')
            .div('处理消息失败，请重试')
            .build();
        await getMessageService().sendCardMessage(parsed.chatId, errorCard);
    }
});
callbackRouter.onCardAction(async (action) => {
    logger.info('Server', `Card action: ${action.actionId} from ${action.openId} in ${action.chatId}`);
    try {
        if (action.actionId === ACTION_ARCHIVE_FULL) {
            logger.debug('Server', '用户点击了"完整归档"');
            const responseCard = CardBuilder.new()
                .header('✅ 归档完成', 'green')
                .div('对话已完整归档到飞书文档')
                .build();
            await getMessageService().sendCardMessage(action.chatId, responseCard);
            logger.debug('Server', '归档确认消息已发送');
        }
        else if (action.actionId === ACTION_ARCHIVE_SUMMARY) {
            logger.debug('Server', '用户点击了"摘要归档"');
        }
        else if (action.actionId === ACTION_ARCHIVE_CANCEL) {
            logger.debug('Server', '用户取消了归档');
        }
    }
    catch (e) {
        logger.error('Server', `Failed to handle card action: ${e}`);
    }
});
logger.info('Server', `Starting server on port ${PORT}...`);
logger.info('Server', `POST http://localhost:${PORT}/feishu`);
logger.info('Server', `GET  http://localhost:${PORT}/health`);
logger.info('Server', `GET  http://localhost:${PORT}/api/admin/models`);
serve({
    fetch: app.fetch,
    port: PORT,
});
logger.info('Server', `Server running at http://localhost:${PORT}`);
//# sourceMappingURL=index.js.map