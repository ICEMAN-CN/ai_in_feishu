/**
 * Module 2.4 Integration Test Script
 * 
 * 联调测试步骤：
 * 1. 设置环境变量或直接填入 FEISHU_APP_ID, FEISHU_APP_SECRET
 * 2. 获取一个有效的 chat_id (机器人已加入的会话)
 * 3. 运行脚本
 */

import { CardBuilder } from '../src/feishu/card-builder';
import { MessageService } from '../src/feishu/message-service';
import { createFeishuClient } from '../src/feishu/client';

// 配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'cli_a950e27b16385cc2';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'hHqlkrvvkaEntftEpsDPufMgUVm8Xjba';

async function main() {
  console.log('🚀 开始 Module 2.4 联调测试...\n');

  // 创建客户端
  const client = createFeishuClient({ appId: FEISHU_APP_ID, appSecret: FEISHU_APP_SECRET });
  const messageService = new MessageService(client);

  // 从命令行参数获取 chat_id
  const chatId = process.argv[2];
  if (!chatId) {
    console.error('❌ 请提供 chat_id 作为参数');
    console.log('用法: npx tsx scripts/test-card-send.ts <chat_id>');
    console.log('\n获取 chat_id 的方式：');
    console.log('1. 在飞书中给机器人发消息');
    console.log('2. 通过 API 查询: GET /open-apis/im/v1/chats');
    process.exit(1);
  }

  console.log(`📨 目标会话: ${chatId}\n`);

  // 测试 1: 发送文本消息
  console.log('=== 测试 1: 发送文本消息 ===');
  try {
    const textMsgId = await messageService.sendTextMessage(chatId, '🤖 你好！这是来自 AI_Feishu 的测试消息');
    console.log(`✅ 文本消息发送成功: ${textMsgId}\n`);
  } catch (e: any) {
    console.error(`❌ 文本消息发送失败: ${e.message}\n`);
  }

  // 测试 2: 发送会话启动卡片
  console.log('=== 测试 2: 发送会话启动卡片 ===');
  try {
    const sessionCard = CardBuilder.sessionStarterCard([
      { label: 'GPT-4', value: 'gpt4' },
      { label: 'Claude 3', value: 'claude3' },
      { label: 'MiniMax', value: 'minimax' }
    ]);
    const sessionCardId = await messageService.sendCardMessage(chatId, sessionCard);
    console.log(`✅ 会话启动卡片发送成功: ${sessionCardId}\n`);
  } catch (e: any) {
    console.error(`❌ 会话启动卡片发送失败: ${e.message}\n`);
  }

  // 测试 3: 发送流式响应卡片
  console.log('=== 测试 3: 发送流式响应卡片 ===');
  try {
    const streamingCard = CardBuilder.streamingCard('Claude 3', '正在思考如何回答...');
    const streamingCardId = await messageService.sendCardMessage(chatId, streamingCard);
    console.log(`✅ 流式响应卡片发送成功: ${streamingCardId}`);
    console.log('   (等待 2 秒后更新卡片内容...)');

    // 等待 2 秒后更新卡片
    await new Promise(resolve => setTimeout(resolve, 2000));

    const updatedStreamingCard = CardBuilder.streamingCard('Claude 3', '这是 **更新后** 的内容！\n\n模型正在思考问题的答案...');
    await messageService.updateCardMessage(streamingCardId, updatedStreamingCard);
    console.log('✅ 流式响应卡片更新成功\n');
  } catch (e: any) {
    console.error(`❌ 流式响应卡片发送/更新失败: ${e.message}\n`);
  }

  // 测试 4: 发送归档确认卡片
  console.log('=== 测试 4: 发送归档确认卡片 ===');
  try {
    const archiveCard = CardBuilder.archiveConfirmCard();
    const archiveCardId = await messageService.sendCardMessage(chatId, archiveCard);
    console.log(`✅ 归档确认卡片发送成功: ${archiveCardId}\n`);
  } catch (e: any) {
    console.error(`❌ 归档确认卡片发送失败: ${e.message}\n`);
  }

  // 测试 5: 发送自定义卡片 (使用 Fluent API)
  console.log('=== 测试 5: 发送自定义卡片 (Fluent API) ===');
  try {
    const customCard = CardBuilder.new()
      .header('🎯 AI_Feishu 联调测试', 'blue')
      .div('这是使用 **Fluent Builder API** 构建的自定义卡片')
      .hr()
      .button('👍 效果不错', 'btn_like', 'primary')
      .button('📝 再改进', 'btn_feedback')
      .build();
    const customCardId = await messageService.sendCardMessage(chatId, customCard);
    console.log(`✅ 自定义卡片发送成功: ${customCardId}\n`);
  } catch (e: any) {
    console.error(`❌ 自定义卡片发送失败: ${e.message}\n`);
  }

  console.log('🎉 联调测试完成！');
}

main().catch(console.error);
