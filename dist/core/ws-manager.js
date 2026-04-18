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
import { WSClient, EventDispatcher, LoggerLevel, Client } from '@larksuiteoapi/node-sdk';
import { logger } from './logger';
// ==================== FeishuWSManager ====================
export class FeishuWSManager {
    wsClient = null;
    client = null;
    eventDispatcher;
    config;
    hasStarted = false;
    constructor(config) {
        this.config = {
            loggerLevel: LoggerLevel.warn,
            ...config,
        };
        // 官方方式：先创建 EventDispatcher
        this.eventDispatcher = new EventDispatcher({});
    }
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
    registerHandler(eventType, handler) {
        if (this.hasStarted) {
            throw new Error('[FeishuWS] Cannot register handler after start()');
        }
        this.eventDispatcher.register({
            [eventType]: handler,
        });
    }
    /**
     * 启动 WebSocket 长连接
     *
     * SDK 内部会自动处理重连，无需外部管理
     */
    start() {
        if (this.hasStarted) {
            logger.warn('FeishuWS', 'Already started');
            return;
        }
        try {
            // 创建 API Client（用于发送消息等 API 调用）
            this.client = new Client({
                appId: this.config.appId,
                appSecret: this.config.appSecret,
                loggerLevel: this.config.loggerLevel,
            });
            // 创建 WSClient（官方方式）
            this.wsClient = new WSClient({
                appId: this.config.appId,
                appSecret: this.config.appSecret,
                loggerLevel: this.config.loggerLevel,
            });
            // 官方方式：start 时传入已注册好 handler 的 eventDispatcher
            this.wsClient.start({
                eventDispatcher: this.eventDispatcher,
            });
            this.hasStarted = true;
            logger.info('FeishuWS', 'WebSocket started');
        }
        catch (error) {
            // 清理已创建的资源，防止部分初始化状态
            this.wsClient = null;
            this.client = null;
            throw new Error(`[FeishuWS] Failed to start: ${error}`);
        }
    }
    /**
     * 停止 WebSocket 连接
     */
    stop() {
        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
        }
        this.client = null;
        this.hasStarted = false; // 重置状态，允许重新 start
        logger.info('FeishuWS', 'WebSocket stopped');
    }
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
    getClient() {
        if (!this.client) {
            throw new Error('[FeishuWS] Client not initialized. Call start() first.');
        }
        return this.client;
    }
    /**
     * 获取连接状态
     */
    isConnected() {
        // wsClient 存在且 hasStarted 为 true 表示已启动
        // SDK 内部会处理重连，连接状态由 SDK 管理
        return this.hasStarted && this.wsClient !== null;
    }
}
// ==================== 工厂函数 ====================
export function createFeishuWSManager(config) {
    return new FeishuWSManager(config);
}
//# sourceMappingURL=ws-manager.js.map