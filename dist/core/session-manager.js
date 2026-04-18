import { v4 as uuidv4 } from 'uuid';
import { getMessagesBySession, deleteMessagesBySession } from './config-store';
const THREAD_MESSAGE_LIMIT = parseInt(process.env.THREAD_MESSAGE_LIMIT || '20', 10);
export class SessionManager {
    db;
    constructor(db) {
        this.db = db;
    }
    async createOrGetSession(p2pId, rootId, parentId, modelId) {
        if (!parentId || parentId === rootId) {
            const threadId = rootId || uuidv4();
            const existing = this.getSessionByThreadId(threadId);
            if (existing) {
                return existing;
            }
            const resolvedModelId = modelId || this.getDefaultModelId();
            if (!resolvedModelId) {
                return null;
            }
            const session = {
                id: uuidv4(),
                threadId,
                p2pId,
                modelId: resolvedModelId,
                systemPrompt: '',
                messageCount: 0,
                messageLimit: THREAD_MESSAGE_LIMIT,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.saveSession(session);
            return session;
        }
        const existingSession = this.getSessionByThreadId(rootId);
        if (!existingSession) {
            throw new Error(`Thread不存在: rootId=${rootId}, parentId=${parentId}`);
        }
        return existingSession;
    }
    getSessionByThreadId(threadId) {
        const row = this.db.prepare('SELECT * FROM sessions WHERE thread_id = ?').get(threadId);
        if (!row)
            return null;
        return {
            id: row.id,
            threadId: row.thread_id,
            p2pId: row.p2p_id,
            modelId: row.model_id,
            systemPrompt: row.system_prompt,
            messageCount: row.message_count,
            messageLimit: row.message_limit,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastMessageAt: row.last_message_at,
        };
    }
    saveSession(session) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions
      (id, thread_id, p2p_id, model_id, system_prompt, message_count, message_limit, created_at, updated_at, last_message_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(session.id, session.threadId, session.p2pId, session.modelId, session.systemPrompt || null, session.messageCount, session.messageLimit, session.createdAt, session.updatedAt, session.lastMessageAt || null);
    }
    updateSessionMessage(sessionId, increment = 1) {
        const now = new Date().toISOString();
        this.db.prepare(`
      UPDATE sessions
      SET message_count = message_count + ?, updated_at = ?, last_message_at = ?
      WHERE id = ?
    `).run(increment, now, now, sessionId);
    }
    getDefaultModelId() {
        try {
            const stmt = this.db.prepare('SELECT id FROM models WHERE is_default = 1 AND enabled = 1 LIMIT 1');
            const row = stmt.get();
            return row?.id || null;
        }
        catch {
            return null;
        }
    }
    getConversation(sessionId, limit) {
        return getMessagesBySession(sessionId, limit);
    }
    truncateSessionMessages(sessionId) {
        const messageLimit = THREAD_MESSAGE_LIMIT;
        deleteMessagesBySession(sessionId, messageLimit);
    }
}
//# sourceMappingURL=session-manager.js.map