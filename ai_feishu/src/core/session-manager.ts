import { v4 as uuidv4 } from 'uuid';
import { Session } from '../types/config';
import { getSession, saveSession as dbSaveSession, getDefaultModel } from './config-store';

const THREAD_MESSAGE_LIMIT = parseInt(process.env.THREAD_MESSAGE_LIMIT || '20', 10);

export class SessionManager {
  constructor(private db: any) {}

  async createOrGetSession(
    p2pId: string,
    rootId?: string,
    parentId?: string,
    modelId?: string
  ): Promise<Session> {
    if (!parentId || parentId === rootId) {
      const threadId = rootId || uuidv4();

      const existing = this.getSessionByThreadId(threadId);
      if (existing) {
        return existing;
      }

      const session: Session = {
        id: uuidv4(),
        threadId,
        p2pId,
        modelId: modelId || this.getDefaultModelId() || '',
        systemPrompt: '',
        messageCount: 0,
        messageLimit: THREAD_MESSAGE_LIMIT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.saveSession(session);
      return session;
    }

    const existingSession = this.getSessionByThreadId(rootId!);
    if (!existingSession) {
      throw new Error(`Thread不存在: rootId=${rootId}, parentId=${parentId}`);
    }
    return existingSession;
  }

  getSessionByThreadId(threadId: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE thread_id = ?').get(threadId) as any;
    if (!row) return null;

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

  saveSession(session: Session): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions
      (id, thread_id, p2p_id, model_id, system_prompt, message_count, message_limit, created_at, updated_at, last_message_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.threadId,
      session.p2pId,
      session.modelId,
      session.systemPrompt || null,
      session.messageCount,
      session.messageLimit,
      session.createdAt,
      session.updatedAt,
      session.lastMessageAt || null
    );
  }

  updateSessionMessage(sessionId: string, increment: number = 1): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE sessions
      SET message_count = message_count + ?, updated_at = ?, last_message_at = ?
      WHERE id = ?
    `).run(increment, now, now, sessionId);
  }

  private getDefaultModelId(): string | null {
    try {
      const stmt = this.db.prepare('SELECT id FROM models WHERE is_default = 1 AND enabled = 1 LIMIT 1');
      const row = stmt.get() as { id: string } | undefined;
      return row?.id || null;
    } catch {
      return null;
    }
  }

  getConversation(sessionId: string, limit?: number): any[] {
    return [];
  }

  truncateSessionMessages(sessionId: string): void {
  }
}