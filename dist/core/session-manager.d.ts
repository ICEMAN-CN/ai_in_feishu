import { Session, ConversationMessage } from '../types/config';
export declare class SessionManager {
    private db;
    constructor(db: any);
    createOrGetSession(p2pId: string, rootId?: string, parentId?: string, modelId?: string): Promise<Session | null>;
    getSessionByThreadId(threadId: string): Session | null;
    saveSession(session: Session): void;
    updateSessionMessage(sessionId: string, increment?: number): void;
    private getDefaultModelId;
    getConversation(sessionId: string, limit?: number): ConversationMessage[];
    truncateSessionMessages(sessionId: string): void;
}
//# sourceMappingURL=session-manager.d.ts.map