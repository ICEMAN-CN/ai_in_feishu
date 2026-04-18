import { Hono } from 'hono';
import { getStats as getVectorStats } from '../core/vector-store';
import { isValidAdminSessionToken } from '../core/token';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
if (!ADMIN_API_KEY) {
    throw new Error('ADMIN_API_KEY environment variable is required');
}
async function authMiddleware(c, next) {
    const authHeader = c.req.header('Authorization');
    let providedKey = authHeader?.replace('Bearer ', '');
    if (!providedKey) {
        providedKey = c.req.header('X-Admin-API-Key');
    }
    if (!providedKey ||
        (providedKey !== ADMIN_API_KEY && !isValidAdminSessionToken(providedKey))) {
        return c.json({ success: false, message: 'Unauthorized: Invalid or missing API key' }, { status: 401 });
    }
    await next();
}
const adminKb = new Hono();
adminKb.use('*', authMiddleware);
let folderManager = null;
let ragPipeline = null;
let vectorStoreService = null;
export function initKBRouter(fm, rp) {
    folderManager = fm;
    ragPipeline = rp;
}
export function initRAGRouter(rp, vs, fm) {
    ragPipeline = rp;
    vectorStoreService = vs;
    if (fm) {
        folderManager = fm;
    }
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
    const body = await c.req.json();
    const { name, url } = body;
    if (!name || !url) {
        return c.json({ success: false, message: 'Missing required fields: name, url' }, 400);
    }
    try {
        const folder = folderManager.addFolder(name, url);
        return c.json({ id: folder.id, success: true }, 201);
    }
    catch (err) {
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
adminKb.post('/sync', async (c) => {
    if (!ragPipeline || !folderManager) {
        c.status(500);
        return c.json({ success: false, message: 'KB router not initialized' });
    }
    const body = await c.req.json().catch(() => {
        return {};
    });
    const folderId = body.folderId;
    try {
        if (folderId) {
            const syncedCount = await ragPipeline.syncFolder(folderId);
            return c.json({ success: true, message: `Synced ${syncedCount} documents` });
        }
        else {
            const folders = folderManager.getAllFolders();
            let totalSynced = 0;
            for (const folder of folders) {
                if (folder.syncEnabled) {
                    const syncedCount = await ragPipeline.syncFolder(folder.id);
                    totalSynced += syncedCount;
                }
            }
            return c.json({ success: true, message: `Synced ${totalSynced} documents from ${folders.filter(f => f.syncEnabled).length} folders` });
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json({ success: false, message }, 500);
    }
});
adminKb.get('/stats', async (c) => {
    if (!vectorStoreService) {
        c.status(500);
        return c.json({ success: false, message: 'RAG router not initialized' });
    }
    try {
        const vectorStats = await getVectorStats();
        let lastSyncAt = null;
        let totalDocuments = 0;
        if (folderManager) {
            const folders = folderManager.getAllFolders();
            for (const folder of folders) {
                if (folder.lastSyncAt) {
                    if (!lastSyncAt || folder.lastSyncAt > lastSyncAt) {
                        lastSyncAt = folder.lastSyncAt;
                    }
                }
                totalDocuments += folder.lastSyncDocCount || 0;
            }
        }
        const avgChunkSizeBytes = 1000;
        const storageSize = `${((vectorStats.totalChunks * avgChunkSizeBytes) / (1024 * 1024)).toFixed(2)}MB`;
        return c.json({
            totalChunks: vectorStats.totalChunks,
            totalDocuments: vectorStats.totalDocuments || totalDocuments,
            storageSize,
            lastSyncAt,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json({ success: false, message }, 500);
    }
});
export default adminKb;
//# sourceMappingURL=admin-kb.js.map