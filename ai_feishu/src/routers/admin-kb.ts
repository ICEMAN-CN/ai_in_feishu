import { Hono } from 'hono';
import { KBFolderManager } from '../core/kb-folder-manager';
import { logger } from '../core/logger';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

async function authMiddleware(c: any, next: () => Promise<void>) {
  if (!ADMIN_API_KEY) {
    logger.warn('AdminAPI', 'ADMIN_API_KEY not set - authentication disabled');
    await next();
    return;
  }

  const providedKey = c.req.header('X-Admin-API-Key');
  if (!providedKey || providedKey !== ADMIN_API_KEY) {
    c.status(401);
    c.json({ success: false, message: 'Unauthorized: Invalid or missing API key' });
    return;
  }

  await next();
}

const adminKb = new Hono();
adminKb.use('*', authMiddleware);

let folderManager: KBFolderManager | null = null;

export function initKBRouter(fm: KBFolderManager): void {
  folderManager = fm;
}

interface CreateFolderBody {
  name: string;
  url: string;
}

adminKb.get('/folders', (c) => {
  if (!folderManager) {
    c.status(500);
    return c.json({ success: false, message: 'KB router not initialized' });
  }

  const folders = folderManager.getAllFolders();
  return c.json({ folders });
});

adminKb.post('/folders', async (c) => {
  if (!folderManager) {
    c.status(500);
    return c.json({ success: false, message: 'KB router not initialized' });
  }

  const body = await c.req.json<CreateFolderBody>();
  const { name, url } = body;

  if (!name || !url) {
    return c.json({ success: false, message: 'Missing required fields: name, url' }, 400);
  }

  try {
    const folder = folderManager.addFolder(name, url);
    return c.json({ id: folder.id, success: true }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ success: false, message }, 400);
  }
});

adminKb.delete('/folders/:id', (c) => {
  if (!folderManager) {
    c.status(500);
    return c.json({ success: false, message: 'KB router not initialized' });
  }

  const id = c.req.param('id');
  const folder = folderManager.getFolder(id);

  if (!folder) {
    return c.json({ success: false, message: 'Folder not found' }, 404);
  }

  folderManager.removeFolder(id);
  return c.json({ success: true });
});

export default adminKb;
