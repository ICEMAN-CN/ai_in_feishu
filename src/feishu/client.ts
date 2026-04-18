/**
 * AI_Feishu Feishu SDK Client
 *
 * Provides Feishu client initialization and configuration.
 */

import { Client, LoggerLevel } from '@larksuiteoapi/node-sdk';

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BOT_NAME = process.env.FEISHU_BOT_NAME || 'AI_Feishu';

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  botName?: string;
}

let feishuClient: Client | null = null;

/**
 * Create a Feishu SDK client
 */
export function createFeishuClient(config?: FeishuConfig): Client {
  const appId = (config?.appId || FEISHU_APP_ID)?.trim();
  const appSecret = (config?.appSecret || FEISHU_APP_SECRET)?.trim();

  if (!appId || !appSecret) {
    throw new Error(
      'FEISHU_APP_ID and FEISHU_APP_SECRET must be set in environment variables or passed as config'
    );
  }

  return new Client({
    appId,
    appSecret,
    loggerLevel: process.env.NODE_ENV === 'production' ? LoggerLevel.warn : LoggerLevel.debug,
  });
}

/**
 * Get the singleton Feishu client instance
 */
export function getFeishuClient(): Client {
  if (!feishuClient) {
    feishuClient = createFeishuClient();
  }
  return feishuClient;
}

/**
 * Get the configured bot name
 */
export function getFeishuBotName(): string {
  return FEISHU_BOT_NAME;
}

/**
 * Check if Feishu credentials are configured
 */
export function isFeishuConfigured(): boolean {
  return Boolean(FEISHU_APP_ID && FEISHU_APP_SECRET);
}

/**
 * Get Feishu configuration (without secrets)
 */
export function getFeishuConfig(): { appId: string; botName: string } {
  return {
    appId: FEISHU_APP_ID,
    botName: FEISHU_BOT_NAME,
  };
}

/**
 * Reset the client (for testing or re-initialization)
 */
export function resetFeishuClient(): void {
  feishuClient = null;
}

export {};
