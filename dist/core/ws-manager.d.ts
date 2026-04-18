/**
 * AI_Feishu WebSocket Manager
 *
 * 基于官方飞书 SDK 的封装，提供简洁的接口。
 *
 * 官方文档：https://open.feishu.cn/document/server-docs/server-side-sdk
 *
 * 使用方式：
 * ```typescript
 * import { FeishuWSManager } from './ws-manager';
 *
 * const wsManager = new FeishuWSManager({
 *   appId: 'xxx',
 *   appSecret: 'xxx',
 * });
 *
 * // 注册消息事件处理器（必须在 start 之前调用）
 * wsManager.registerHandler('im.message.receive_v1', async (data) => {
 *   console.log('收到消息:', data);
 * });
 *
 * // 启动（SDK 会自动处理重连）
 * wsManager.start();
 *
 * // 如需发送消息
 * const client = wsManager.getClient();
 * await client.im.v1.message.create({ ... });
 * ```
 */
import { LoggerLevel, Client } from '@larksuiteoapi/node-sdk';
export interface WSConfig {
    appId: string;
    appSecret: string;
    loggerLevel?: LoggerLevel;
}
/**
 * 飞书事件处理器类型
 */
export type FeishuEventHandler<T = any> = (data: T) => void | Promise<void>;
export declare class FeishuWSManager {
    private wsClient;
    private client;
    private eventDispatcher;
    private config;
    private hasStarted;
    constructor(config: WSConfig);
    /**
     * 注册飞书事件处理器
     *
     * @param eventType 事件类型，如 'im.message.receive_v1'
     * @param handler 事件处理函数
     *
     * @example
     * ```typescript
     * wsManager.registerHandler('im.message.receive_v1', async (data) => {
     *   const { message } = data;
     *   console.log('收到消息:', message.content);
     * });
     * ```
     */
    registerHandler<T = any>(eventType: string, handler: FeishuEventHandler<T>): void;
    /**
     * 启动 WebSocket 长连接
     *
     * SDK 内部会自动处理重连，无需外部管理
     */
    start(): void;
    /**
     * 停止 WebSocket 连接
     */
    stop(): void;
    /**
     * 获取 Feishu API Client
     *
     * 用于发送消息、调用其他飞书 API
     *
     * @example
     * ```typescript
     * const client = wsManager.getClient();
     * await client.im.v1.message.create({
     *   params: { receive_id_type: 'chat_id' },
     *   data: { receive_id: 'chat_id', content: '...', msg_type: 'text' }
     * });
     * ```
     */
    getClient(): Client;
    /**
     * 获取连接状态
     */
    isConnected(): boolean;
}
export declare function createFeishuWSManager(config: WSConfig): FeishuWSManager;
//# sourceMappingURL=ws-manager.d.ts.map