import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { MCPToolAuth } from '@/types/config';

// Mock MCPClient interface
interface MockMCPClient {
  isConnected: () => boolean;
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
  callWithFallback: (toolName: string, args: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>;
}

// Mock the MCPClient module
vi.mock('@/core/mcp-client', () => ({
  getMCPClient: vi.fn(),
}));

describe('MCPToolAuthManager', () => {
  let db: Database.Database;
  let mockClient: MockMCPClient;

  // Helper to create a fresh in-memory database
  const createTestDb = () => {
    const testDb = new Database(':memory:');
    testDb.exec(`
      CREATE TABLE mcp_tool_auth (
        tool_name TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 1,
        fallback_enabled INTEGER NOT NULL DEFAULT 0,
        fallback_method TEXT
      )
    `);
    return testDb;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    db = createTestDb();
    mockClient = {
      isConnected: vi.fn(() => true),
      callTool: vi.fn().mockResolvedValue({ result: 'tool success' }),
      callWithFallback: vi.fn().mockResolvedValue({ success: true, data: 'fallback success' }),
    };
  });

  // TC-4.2-001: isToolEnabled returns true for enabled tool
  it('TC-4.2-001: isToolEnabled returns true for enabled tool', () => {
    // Insert enabled tool
    db.prepare(`
      INSERT INTO mcp_tool_auth (tool_name, enabled, fallback_enabled)
      VALUES ('read_document', 1, 0)
    `).run();

    // Import and instantiate manager
    const { MCPToolAuthManager } = require('@/core/mcp-tool-auth');
    const manager = new MCPToolAuthManager(db);

    expect(manager.isToolEnabled('read_document')).toBe(true);
  });

  // TC-4.2-002: isToolEnabled returns false for disabled tool
  it('TC-4.2-002: isToolEnabled returns false for disabled tool', () => {
    // Insert disabled tool
    db.prepare(`
      INSERT INTO mcp_tool_auth (tool_name, enabled, fallback_enabled)
      VALUES ('delete_document', 0, 0)
    `).run();

    const { MCPToolAuthManager } = require('@/core/mcp-tool-auth');
    const manager = new MCPToolAuthManager(db);

    expect(manager.isToolEnabled('delete_document')).toBe(false);
  });

  // TC-4.2-003: callToolIfAllowed succeeds for enabled tool
  it('TC-4.2-003: callToolIfAllowed succeeds for enabled tool', async () => {
    db.prepare(`
      INSERT INTO mcp_tool_auth (tool_name, enabled, fallback_enabled)
      VALUES ('read_document', 1, 0)
    `).run();

    const { MCPToolAuthManager } = require('@/core/mcp-tool-auth');
    const manager = new MCPToolAuthManager(db, mockClient as any);

    const result = await manager.callToolIfAllowed('read_document', { document_id: '123' });

    expect(result).toEqual({ result: 'tool success' });
    expect(mockClient.callTool).toHaveBeenCalledWith('read_document', { document_id: '123' });
  });

  // TC-4.2-004: callToolIfAllowed throws for disabled tool
  it('TC-4.2-004: callToolIfAllowed throws for disabled tool', async () => {
    db.prepare(`
      INSERT INTO mcp_tool_auth (tool_name, enabled, fallback_enabled)
      VALUES ('delete_document', 0, 0)
    `).run();

    const { MCPToolAuthManager } = require('@/core/mcp-tool-auth');
    const manager = new MCPToolAuthManager(db, mockClient as any);

    await expect(manager.callToolIfAllowed('delete_document', {}))
      .rejects.toThrow('Tool delete_document is disabled');
  });

  // TC-4.2-005: callToolIfAllowed returns fallback when MCP fails and fallback enabled
  it('TC-4.2-005: callToolIfAllowed returns fallback result when MCP fails and fallback enabled', async () => {
    db.prepare(`
      INSERT INTO mcp_tool_auth (tool_name, enabled, fallback_enabled, fallback_method)
      VALUES ('search_wiki', 1, 1, 'search_local_kb')
    `).run();

    // Make callTool fail but callWithFallback succeed
    mockClient.callTool = vi.fn().mockRejectedValue(new Error('MCP error'));
    mockClient.callWithFallback = vi.fn().mockResolvedValue({ success: true, data: 'fallback result' });

    const { MCPToolAuthManager } = require('@/core/mcp-tool-auth');
    const manager = new MCPToolAuthManager(db, mockClient as any);

    const result = await manager.callToolIfAllowed('search_wiki', { query: 'test' });

    expect(result).toEqual({ success: true, data: 'fallback result' });
    expect(mockClient.callWithFallback).toHaveBeenCalledWith('search_wiki', { query: 'test' });
  });
});
