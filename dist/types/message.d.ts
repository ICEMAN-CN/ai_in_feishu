export interface FeishuMessageHeader {
    event_id: string;
    event_type?: string;
    create_time?: string;
    token?: string;
    app_id?: string;
    tenant_key?: string;
}
export interface FeishuMessageSender {
    id?: {
        open_id: string;
    };
    sender_type?: 'user' | 'bot';
    tenant_key?: string;
}
export interface FeishuMessage {
    message_id: string;
    root_id?: string;
    parent_id?: string;
    create_time?: string;
    chat_id: string;
    chat_type: 'p2p' | 'group';
    message_type: 'text' | 'post' | 'interactive';
    content: string;
    update_time?: string;
}
export interface FeishuMessageEvent {
    schema?: string;
    header?: FeishuMessageHeader;
    event_id?: string;
    event_type?: string;
    create_time?: string;
    token?: string;
    tenant_key?: string;
    app_id?: string;
    event?: {
        sender?: FeishuMessageSender;
        receiver?: {
            id?: {
                open_id: string;
            };
            receiver_type?: string;
        };
        message?: FeishuMessage;
    };
    message?: FeishuMessage;
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
//# sourceMappingURL=message.d.ts.map