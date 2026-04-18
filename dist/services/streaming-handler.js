import { v4 as uuidv4 } from 'uuid';
import { CardBuilder } from '../feishu/card-builder';
import { contextManager } from './context-manager';
import { saveMessage } from '../core/config-store';
import { logger } from '../core/logger';
import { metrics } from '../core/metrics-logger';
const DEFAULT_UPDATE_INTERVAL_MS = 300;
export class StreamingHandler {
    llmRouter;
    sessionManager;
    messageService;
    config;
    currentModelName = 'AI';
    constructor(llmRouter, sessionManager, messageService, config) {
        this.llmRouter = llmRouter;
        this.sessionManager = sessionManager;
        this.messageService = messageService;
        this.config = {
            updateIntervalMs: config?.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS,
        };
    }
    async handleUserMessage(chatId, threadId, userMessage) {
        const requestId = `stream-${chatId}-${Date.now()}`;
        const methodStart = Date.now();
        metrics.recordRequestStart(requestId, 'streaming');
        const session = this.sessionManager.getSessionByThreadId(threadId);
        if (!session) {
            throw new Error(`Session not found for threadId: ${threadId}`);
        }
        const modelName = this.llmRouter.getModelName(session.modelId);
        this.currentModelName = modelName;
        const initialCard = CardBuilder.streamingCard(modelName, '正在思考...');
        const feishuMessageId = await this.messageService.sendCardMessage(chatId, initialCard);
        const truncatedUserMessage = contextManager.truncateMessage(userMessage);
        const conversationHistory = this.sessionManager.getConversation(session.id);
        const truncatedHistory = contextManager.truncateHistory(conversationHistory, session.messageLimit);
        const userMsg = { role: 'user', content: truncatedUserMessage };
        const allMessages = [...truncatedHistory, userMsg];
        saveMessage({
            id: uuidv4(),
            sessionId: session.id,
            role: 'user',
            content: truncatedUserMessage,
            modelId: session.modelId,
            messageId: feishuMessageId,
            createdAt: new Date().toISOString(),
        });
        if (conversationHistory.length > session.messageLimit) {
            this.sessionManager.truncateSessionMessages(session.id);
        }
        let fullResponse = '';
        let lastUpdateTime = 0;
        let firstByteTime = null;
        try {
            for await (const textDelta of this.llmRouter.streamGenerate(session.modelId, allMessages, session.systemPrompt)) {
                fullResponse += textDelta;
                // Record first byte time
                if (firstByteTime === null) {
                    firstByteTime = Date.now() - methodStart;
                    metrics.recordStreamingFirstByte(requestId, firstByteTime);
                }
                const now = Date.now();
                if (now - lastUpdateTime >= this.config.updateIntervalMs) {
                    await this.updateCardWithCursor(feishuMessageId, fullResponse);
                    lastUpdateTime = now;
                }
            }
            const totalDuration = Date.now() - methodStart;
            metrics.recordRequestEnd(requestId);
            // Log structured timing
            logger.info('StreamingHandler', JSON.stringify({
                metric: {
                    type: 'streaming',
                    requestId,
                    firstByteMs: firstByteTime,
                    totalMs: totalDuration,
                    chunks: fullResponse.length,
                }
            }));
            await this.finalizeCard(feishuMessageId, fullResponse);
            saveMessage({
                id: uuidv4(),
                sessionId: session.id,
                role: 'assistant',
                content: fullResponse,
                modelId: session.modelId,
                createdAt: new Date().toISOString(),
            });
        }
        catch (error) {
            await this.sendErrorCard(feishuMessageId, error instanceof Error ? error.message : String(error));
            throw error;
        }
        this.sessionManager.updateSessionMessage(session.id, 1);
    }
    async updateCardWithCursor(messageId, content) {
        const card = {
            schema: '2.0',
            card: {
                header: {
                    title: { tag: 'plain_text', content: `🤖 ${this.currentModelName}` },
                    template: 'grey',
                },
                elements: [
                    { tag: 'div', text: { tag: 'lark_md', content: content + '▌' }, id: 'response_content' },
                    { tag: 'hr', id: 'divider' },
                    {
                        tag: 'note',
                        elements: [
                            { tag: 'plain_text', content: '流式输出中...' },
                        ],
                    },
                ],
            },
        };
        await this.messageService.updateCardMessage(messageId, card);
    }
    async finalizeCard(messageId, content) {
        const card = {
            schema: '2.0',
            card: {
                header: {
                    title: { tag: 'plain_text', content: `🤖 ${this.currentModelName}` },
                    template: 'grey',
                },
                elements: [
                    { tag: 'div', text: { tag: 'lark_md', content }, id: 'response_content' },
                ],
            },
        };
        await this.messageService.updateCardMessage(messageId, card);
    }
    async sendErrorCard(messageId, errorMessage) {
        const card = {
            schema: '2.0',
            card: {
                header: {
                    title: { tag: 'plain_text', content: '❌ 错误' },
                    template: 'red',
                },
                elements: [
                    {
                        tag: 'div',
                        text: { tag: 'lark_md', content: `**Stream interrupted:**\n\n${errorMessage}` },
                    },
                ],
            },
        };
        await this.messageService.updateCardMessage(messageId, card);
    }
}
//# sourceMappingURL=streaming-handler.js.map