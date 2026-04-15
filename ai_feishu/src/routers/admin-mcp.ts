import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { getMCPClient } from '../core/mcp-client';
import { logger } from '../core/logger';
import type { MCPToolAuthManager } from '../core/mcp-tool-auth';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

async function authMiddleware(c: any, next: () => Promise<void>) {
  if (!ADMIN_API_KEY) {
    logger.warn('MCPToolAuthManager', 'ADMIN_API_KEY not set - authentication disabled');
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

export function initMCPAdminRouter(db: Database.Database, authManager: MCPToolAuthManager) {
  const mcpRouter = new Hono();
  mcpRouter.use('*', authMiddleware);

  // GET /status - returns connection status
  mcpRouter.get('/status', (c) => {
    const mcpClient = getMCPClient();
    const connected = mcpClient?.isConnected() ?? false;

    // Get fallback enabled status from auth manager
    const allTools = authManager.getAllToolAuths();
    const fallbackEnabled = allTools.some(t => t.fallbackEnabled);

    // Get server URL from MCP client config
    const serverUrl = mcpClient?.getConfig().serverUrl ?? '';

    return c.json({
      connected,
      fallbackEnabled,
      serverUrl,
    });
  });

  // GET /tools - returns all tools with availableInMCP flag
  mcpRouter.get('/tools', (c) => {
    const mcpClient = getMCPClient();
    const mcpTools = mcpClient?.getTools() ?? [];
    const mcpToolNames = new Set(mcpTools.map(t => t.name));

    const allTools = authManager.getAllToolAuths();
    const tools = allTools.map(tool => ({
      name: tool.toolName,
      description: mcpTools.find(t => t.name === tool.toolName)?.description ?? '',
      enabled: tool.enabled,
      fallbackEnabled: tool.fallbackEnabled,
      fallbackMethod: tool.fallbackMethod,
      availableInMCP: mcpToolNames.has(tool.toolName),
    }));

    return c.json({ tools });
  });

  // PUT /tools/:name - enable/disable a tool
  mcpRouter.put('/tools/:name', async (c) => {
    const toolName = c.req.param('name');
    const body = await c.req.json<{ enabled: boolean }>();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return c.json({ success: false, message: 'Missing required field: enabled (boolean)' }, 400);
    }

    const toolAuth = authManager.getToolAuth(toolName);
    if (!toolAuth) {
      return c.json({ success: false, message: `Tool not found: ${toolName}` }, 404);
    }

    authManager.setToolEnabled(toolName, enabled);

    return c.json({ success: true });
  });

  // GET /health - returns health status
  mcpRouter.get('/health', async (c) => {
    const mcpClient = getMCPClient();
    const connected = mcpClient?.isConnected() ?? false;
    const toolsLoaded = mcpClient?.getTools().length ?? 0;

    let healthy = false;
    if (mcpClient) {
      try {
        healthy = await mcpClient.healthCheck();
      } catch {
        healthy = false;
      }
    }

    return c.json({
      healthy,
      connected,
      toolsLoaded,
    });
  });

  return mcpRouter;
}