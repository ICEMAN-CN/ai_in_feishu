import { LLMRouter } from './llm-router';
import { SessionManager } from '../core/session-manager';
import { MessageService } from '../feishu/message-service';
import { CardBuilder } from '../feishu/card-builder';

export interface StreamingHandlerConfig {
  updateIntervalMs: number;
}

const DEFAULT_UPDATE_INTERVAL_MS = 300;

export class StreamingHandler {
  private config: StreamingHandlerConfig;
  private currentModelName: string = 'AI';

  constructor(
    private llmRouter: LLMRouter,
    private sessionManager: SessionManager,
    private messageService: MessageService,
    config?: Partial<StreamingHandlerConfig>
  ) {
    this.config = {
      updateIntervalMs: config?.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS,
    };
  }

  async handleUserMessage(
    chatId: string,
    threadId: string,
    userMessage: string
  ): Promise<void> {
    const session = this.sessionManager.getSessionByThreadId(threadId);
    if (!session) {
      throw new Error(`Session not found for threadId: ${threadId}`);
    }

    const modelName = this.llmRouter.getModelName(session.modelId);
    this.currentModelName = modelName;

    const initialCard = CardBuilder.streamingCard(modelName, '正在思考...');
    const messageId = await this.messageService.sendCardMessage(chatId, initialCard);

    const messages = [{ role: 'user' as const, content: userMessage }];
    let fullResponse = '';
    let lastUpdateTime = 0;

    try {
      for await (const textDelta of this.llmRouter.streamGenerate(
        session.modelId,
        messages,
        session.systemPrompt
      )) {
        fullResponse += textDelta;

        const now = Date.now();
        if (now - lastUpdateTime >= this.config.updateIntervalMs) {
          await this.updateCardWithCursor(messageId, fullResponse);
          lastUpdateTime = now;
        }
      }

      await this.finalizeCard(messageId, fullResponse);
    } catch (error) {
      await this.sendErrorCard(messageId, error instanceof Error ? error.message : String(error));
      throw error;
    }

    this.sessionManager.updateSessionMessage(session.id, 1);
  }

  private async updateCardWithCursor(messageId: string, content: string): Promise<void> {
    const card = {
      schema: '2.0',
      card: {
        header: {
          title: { tag: 'plain_text' as const, content: `🤖 ${this.currentModelName}` },
          template: 'grey' as const,
        },
        elements: [
          { tag: 'div' as const, text: { tag: 'lark_md' as const, content: content + '▌' }, id: 'response_content' },
          { tag: 'hr' as const, id: 'divider' },
          {
            tag: 'note' as const,
            elements: [
              { tag: 'plain_text' as const, content: '流式输出中...' },
            ],
          },
        ],
      },
    };
    await this.messageService.updateCardMessage(messageId, card);
  }

  private async finalizeCard(messageId: string, content: string): Promise<void> {
    const card = {
      schema: '2.0',
      card: {
        header: {
          title: { tag: 'plain_text' as const, content: `🤖 ${this.currentModelName}` },
          template: 'grey' as const,
        },
        elements: [
          { tag: 'div' as const, text: { tag: 'lark_md' as const, content }, id: 'response_content' },
        ],
      },
    };
    await this.messageService.updateCardMessage(messageId, card);
  }

  private async sendErrorCard(messageId: string, errorMessage: string): Promise<void> {
    const card = {
      schema: '2.0',
      card: {
        header: {
          title: { tag: 'plain_text' as const, content: '❌ 错误' },
          template: 'red' as const,
        },
        elements: [
          {
            tag: 'div' as const,
            text: { tag: 'lark_md' as const, content: `**Stream interrupted:**\n\n${errorMessage}` },
          },
        ],
      },
    };
    await this.messageService.updateCardMessage(messageId, card);
  }
}

export {};