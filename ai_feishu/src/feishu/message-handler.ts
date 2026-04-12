import { FeishuMessageEvent, ParsedMessage } from '../types/message';

export class MessageHandler {
  private processedMessageIds = new Set<string>();

  parseMessage(event: FeishuMessageEvent): ParsedMessage {
    const eventId = event.event_id || event.header?.event_id || '';
    const timestamp = event.create_time || event.header?.create_time || '';
    const message = event.message || event.event?.message;
    const sender = event.event?.sender;

    let content: unknown;
    try {
      content = JSON.parse(message?.content || '{}');
    } catch {
      content = { text: message?.content || '' };
    }

    return {
      eventId,
      messageId: message?.message_id || '',
      rootId: message?.root_id || message?.message_id || '',
      parentId: message?.parent_id || '',
      chatId: message?.chat_id || '',
      chatType: message?.chat_type || 'p2p',
      messageType: message?.message_type || 'text',
      content,
      senderOpenId: sender?.id?.open_id || '',
      senderType: sender?.sender_type || 'user',
      timestamp,
    };
  }

  isDuplicate(messageId: string): boolean {
    if (this.processedMessageIds.has(messageId)) {
      return true;
    }
    this.processedMessageIds.add(messageId);

    if (this.processedMessageIds.size > 10000) {
      const iterator = this.processedMessageIds.values();
      for (let i = 0; i < 5000; i++) {
        this.processedMessageIds.delete(iterator.next().value);
      }
    }

    return false;
  }

  isTextMessage(parsed: ParsedMessage): boolean {
    return parsed.messageType === 'text';
  }

  isInteractiveMessage(parsed: ParsedMessage): boolean {
    return parsed.messageType === 'interactive';
  }

  extractTextContent(parsed: ParsedMessage): string {
    if (parsed.messageType === 'text' && typeof parsed.content === 'object' && parsed.content !== null) {
      return (parsed.content as { text?: string }).text || '';
    }
    return '';
  }
}
