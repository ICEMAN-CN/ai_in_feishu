export class MessageHandler {
    processedMessageIds = new Set();
    parseMessage(event) {
        const eventId = event.event_id || event.header?.event_id || '';
        const timestamp = event.create_time || event.header?.create_time || '';
        const message = event.message || event.event?.message;
        const sender = event.event?.sender;
        let content;
        try {
            content = JSON.parse(message?.content || '{}');
        }
        catch {
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
    isDuplicate(messageId) {
        if (this.processedMessageIds.has(messageId)) {
            return true;
        }
        this.processedMessageIds.add(messageId);
        if (this.processedMessageIds.size > 10000) {
            const iterator = this.processedMessageIds.values();
            for (let i = 0; i < 5000; i++) {
                const next = iterator.next();
                if (next.value) {
                    this.processedMessageIds.delete(next.value);
                }
            }
        }
        return false;
    }
    isTextMessage(parsed) {
        return parsed.messageType === 'text';
    }
    isInteractiveMessage(parsed) {
        return parsed.messageType === 'interactive';
    }
    extractTextContent(parsed) {
        if (parsed.messageType === 'text' && typeof parsed.content === 'object' && parsed.content !== null) {
            return parsed.content.text || '';
        }
        return '';
    }
}
//# sourceMappingURL=message-handler.js.map