/**
 * Context Manager - 上下文管理器
 *
 * 负责消息截断、历史管理和Token预算计算
 * 确保对话上下文符合模型限制
 */
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '10000');
const THREAD_MESSAGE_LIMIT = parseInt(process.env.THREAD_MESSAGE_LIMIT || '20');
const MAX_RETRIEVAL_CHUNKS = parseInt(process.env.MAX_RETRIEVAL_CHUNKS || '5');
/**
 * ContextManager - 上下文管理器
 *
 * 提供消息截断、历史管理和Token预算计算功能
 */
export class ContextManager {
    config = {
        maxMessageLength: MAX_MESSAGE_LENGTH,
        threadMessageLimit: THREAD_MESSAGE_LIMIT,
        maxRetrievalChunks: MAX_RETRIEVAL_CHUNKS,
        tokenBudgetPercent: 0.2,
    };
    /**
     * 截断超过最大长度的消息
     */
    truncateMessage(content) {
        if (content.length > this.config.maxMessageLength) {
            return content.slice(0, this.config.maxMessageLength) +
                '\n\n[消息已截断，超出最大长度限制]';
        }
        return content;
    }
    /**
     * 截断对话历史，保留最近的消息
     */
    truncateHistory(messages, limit) {
        const messageLimit = limit || this.config.threadMessageLimit;
        if (messages.length <= messageLimit) {
            return messages;
        }
        return messages.slice(-messageLimit);
    }
    /**
     * 计算Token预算
     * 预留20%给系统prompt和检索结果
     */
    calculateTokenBudget(contextWindow) {
        return Math.floor(contextWindow * (1 - this.config.tokenBudgetPercent));
    }
    /**
     * 根据Token预算截断内容
     */
    truncateForTokenBudget(content, contextWindow, currentTokens) {
        const budget = this.calculateTokenBudget(contextWindow);
        const contentTokens = this.estimateTokens(content);
        if (currentTokens + contentTokens <= budget) {
            return content;
        }
        // 按比例截断
        const ratio = budget / (currentTokens + contentTokens);
        const truncatedLength = Math.floor(content.length * ratio);
        return content.slice(0, truncatedLength) + '\n\n[内容已截断以符合Token限制]';
    }
    /**
     * 估算Token数量
     * 简单估算：中文约2字符=1token，英文约4字符=1token
     */
    estimateTokens(text) {
        let tokens = 0;
        for (const char of text) {
            if (char.charCodeAt(0) > 127) {
                tokens += 0.5; // 中文
            }
            else {
                tokens += 0.25; // 英文/符号
            }
        }
        return Math.ceil(tokens);
    }
    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(config) {
        this.config = {
            ...this.config,
            ...config,
        };
    }
}
// 单例导出
export const contextManager = new ContextManager();
//# sourceMappingURL=context-manager.js.map