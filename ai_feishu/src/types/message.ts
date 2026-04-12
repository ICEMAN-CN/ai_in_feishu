/**
 * Feishu Message Types
 *
 * Type definitions for Feishu message events from the SDK.
 */

export interface FeishuMessageHeader {
  event_id: string;
  event_type: 'im.message.receive_v1';
  create_time: string;
  token: string;
  app_id: string;
  tenant_key: string;
}

export interface FeishuMessageSender {
  sender_id: { open_id: string };
  sender_type: 'user' | 'bot';
}

export interface FeishuMessage {
  message_id: string;
  root_id: string;
  parent_id: string;
  create_time: string;
  chat_id: string;
  chat_type: 'p2p' | 'group';
  message_type: 'text' | 'post' | 'interactive';
  content: string;
}

export interface FeishuMessageEvent {
  header: FeishuMessageHeader;
  event: {
    sender: FeishuMessageSender;
    receiver: { receiver_id: { open_id: string }; receiver_type: 'user' | 'bot' };
    message: FeishuMessage;
  };
}

export interface ParsedMessage {
  eventId: string;
  messageId: string;
  rootId: string;
  parentId: string;
  chatId: string;
  chatType: 'p2p' | 'group';
  messageType: 'text' | 'post' | 'interactive';
  content: unknown;
  senderOpenId: string;
  senderType: 'user' | 'bot';
  timestamp: string;
}
