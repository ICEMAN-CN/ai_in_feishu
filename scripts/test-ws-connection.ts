/**
 * Feishu WebSocket Integration Test Script
 *
 * Usage:
 *   FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx npx tsx scripts/test-ws-connection.ts
 */

import { FeishuWSManager } from '../src/core/ws-manager';
import { LoggerLevel } from '@larksuiteoapi/node-sdk';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load .env file
function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }
}

loadEnv();

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

if (!APP_ID || !APP_SECRET) {
  console.error('[Error] Please set FEISHU_APP_ID and FEISHU_APP_SECRET environment variables');
  process.exit(1);
}

console.log('[Info] Feishu WebSocket Integration Test');
console.log(`[Info] App ID: ${APP_ID}\n`);

// Create WS Manager
const wsManager = new FeishuWSManager({
  appId: APP_ID,
  appSecret: APP_SECRET,
  loggerLevel: LoggerLevel.debug,
});

// Register message event handler
wsManager.registerHandler('im.message.receive_v1', async (data) => {
  console.log('\n[Message Received]');
  console.log(`  Event Type: ${data.event_type}`);
  console.log(`  Chat Type: ${data.message.chat_type}`);
  console.log(`  Content: ${data.message.content}`);
  console.log(`  Sender: ${data.sender?.sender_id?.open_id || 'unknown'}`);
});

// Start connection
console.log('[Info] Starting WebSocket connection...\n');

wsManager.start();

console.log('[Info] Connected! Waiting for messages...\n');
console.log('[Info] Send a message to the bot to test\n');
console.log('[Info] Press Ctrl+C to exit\n');

// Keep running
process.on('SIGINT', () => {
  console.log('\n[Info] Shutting down...');
  wsManager.stop();
  process.exit(0);
});
