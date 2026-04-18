/**
 * Context Manager - 上下文管理器
 *
 * 负责消息截断、历史管理和Token预算计算
 * 确保对话上下文符合模型限制
 */
export interface ContextConfig {
    maxMessageLength: number;
    threadMessageLimit: number;
    maxRetrievalChunks: number;
    tokenBudgetPercent: number;
}
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}
/**
 * ContextManager - 上下文管理器
 *
 * 提供消息截断、历史管理和Token预算计算功能
 */
export declare class ContextManager {
    private config;
    /**
     * 截断超过最大长度的消息
     */
    truncateMessage(content: string): string;
    /**
     * 截断对话历史，保留最近的消息
     */
    truncateHistory(messages: Message[], limit?: number): Message[];
    /**
     * 计算Token预算
     * 预留20%给系统prompt和检索结果
     */
    calculateTokenBudget(contextWindow: number): number;
    /**
     * 根据Token预算截断内容
     */
    truncateForTokenBudget(content: string, contextWindow: number, currentTokens: number): string;
    /**
     * 估算Token数量
     * 简单估算：中文约2字符=1token，英文约4字符=1token
     */
    estimateTokens(text: string): number;
    /**
     * 获取当前配置
     */
    getConfig(): ContextConfig;
    /**
     * 更新配置
     */
    updateConfig(config: Partial<ContextConfig>): void;
}
export declare const contextManager: ContextManager;
//# sourceMappingURL=context-manager.d.ts.map