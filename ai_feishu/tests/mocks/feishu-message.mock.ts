import type {
  FeishuMessageEvent,
  FeishuMessage,
  FeishuMessageSender,
} from '../../src/types/message';

export interface MockFeishuMessageEventOptions {
  chatId?: string;
  chatType?: 'p2p' | 'group';
  content?: string;
  messageType?: 'text' | 'post' | 'interactive';
  rootId?: string;
  parentId?: string;
  eventId?: string;
  messageId?: string;
  senderOpenId?: string;
  senderType?: 'user' | 'bot';
}

export interface MockCardActionEventOptions {
  actionId?: string;
  value?: Record<string, unknown>;
  chatId?: string;
  openId?: string;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createMockFeishuMessageEvent(
  options: MockFeishuMessageEventOptions = {}
): FeishuMessageEvent {
  const {
    chatId = 'chat_test_123',
    chatType = 'p2p',
    content = '{"text":"Hello world"}',
    messageType = 'text',
    rootId = '',
    parentId = '',
    eventId = generateId('evt'),
    messageId = generateId('msg'),
    senderOpenId = 'ou_test_sender',
    senderType = 'user',
  } = options;

  const message: FeishuMessage = {
    message_id: messageId,
    root_id: rootId || undefined,
    parent_id: parentId || undefined,
    create_time: new Date().toISOString(),
    chat_id: chatId,
    chat_type: chatType,
    message_type: messageType,
    content,
    update_time: new Date().toISOString(),
  };

  const sender: FeishuMessageSender = {
    id: { open_id: senderOpenId },
    sender_type: senderType,
    tenant_key: 'test_tenant',
  };

  return {
    schema: '2.0',
    header: {
      event_id: eventId,
      event_type: 'im.message.receive_v1',
      create_time: new Date().toISOString(),
      token: 'test_token',
      app_id: 'cli_test_app',
      tenant_key: 'test_tenant',
    },
    event_id: eventId,
    event_type: 'im.message.receive_v1',
    create_time: new Date().toISOString(),
    token: 'test_token',
    tenant_key: 'test_tenant',
    app_id: 'cli_test_app',
    event: {
      sender,
      receiver: {
        id: { open_id: 'ou_test_receiver' },
        receiver_type: 'user',
      },
      message,
    },
    message,
  };
}

export function createMockCardActionEvent(
  options: MockCardActionEventOptions = {}
): FeishuMessageEvent {
  const {
    actionId = 'test_action',
    value = {},
    chatId = 'chat_test_123',
    openId = 'ou_test_user',
  } = options;

  const cardContent = JSON.stringify({
    action_id: actionId,
    value,
  });

  return createMockFeishuMessageEvent({
    chatId,
    content: cardContent,
    messageType: 'interactive',
    senderOpenId: openId,
    senderType: 'user',
  });
}