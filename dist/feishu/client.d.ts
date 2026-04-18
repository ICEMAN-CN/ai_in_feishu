/**
 * AI_Feishu Feishu SDK Client
 *
 * Provides Feishu client initialization and configuration.
 */
import { Client } from '@larksuiteoapi/node-sdk';
export interface FeishuConfig {
    appId: string;
    appSecret: string;
    botName?: string;
}
/**
 * Create a Feishu SDK client
 */
export declare function createFeishuClient(config?: FeishuConfig): Client;
/**
 * Get the singleton Feishu client instance
 */
export declare function getFeishuClient(): Client;
/**
 * Get the configured bot name
 */
export declare function getFeishuBotName(): string;
/**
 * Check if Feishu credentials are configured
 */
export declare function isFeishuConfigured(): boolean;
/**
 * Get Feishu configuration (without secrets)
 */
export declare function getFeishuConfig(): {
    appId: string;
    botName: string;
};
/**
 * Reset the client (for testing or re-initialization)
 */
export declare function resetFeishuClient(): void;
export {};
//# sourceMappingURL=client.d.ts.map