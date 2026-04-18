import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { MCPToolAuthManager } from '../core/mcp-tool-auth';
export declare function initMCPAdminRouter(db: Database.Database, authManager: MCPToolAuthManager): Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
//# sourceMappingURL=admin-mcp.d.ts.map