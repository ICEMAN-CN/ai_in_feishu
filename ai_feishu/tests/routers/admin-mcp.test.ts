import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';

const mockMCPClient = {
  isConnected: vi.fn().mockReturnValue(true),
  getConnectionState: vi.fn().mockReturnValue({ connected: true, reconnectAttempts: 0 }),
  getConfig: vi.fn().mockReturnValue({ serverUrl: 'http://localhost:3000' }),
  getTools: vi.fn().mockReturnValue([
    {
      name: 'read_document',
      description: '读取飞书文档内容',
      inputSchema: { type: 'object', properties: { document_id: { type: 'string' } }, required: ['document_id'] },
      fallbackMethod: 'feishu.docx.document.get',
    },
    {
      name: 'create_document',
      description: '创建飞书文档',
      inputSchema: { type: 'object', properties: { parent_token: { type: 'string' }, title: { type: 'string' } }, required: ['parent_token', 'title'] },
      fallbackMethod: 'feishu.docx.document.create',
    },
  ]),
  healthCheck: vi.fn().mockResolvedValue(true),
};

vi.mock('@/core/mcp-client', () => ({
  getMCPClient: vi.fn(() => mockMCPClient),
  initMCPClient: vi.fn(() => mockMCPClient),
  destroyMCPClient: vi.fn(),
}));

const mockToolAuthManager = {
  getAllToolAuths: vi.fn().mockReturnValue([
    { toolName: 'read_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.get' },
    { toolName: 'create_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.create' },
    { toolName: 'search_wiki_or_drive', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.search' },
    { toolName: 'update_document', enabled: false, fallbackEnabled: false },
  ]),
  getToolAuth: vi.fn().mockImplementation((name: string) => {
    const auths: Record<string, any> = {
      read_document: { toolName: 'read_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.get' },
      create_document: { toolName: 'create_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.create' },
      update_document: { toolName: 'update_document', enabled: false, fallbackEnabled: false },
    };
    return auths[name] || null;
  }),
  setToolEnabled: vi.fn(),
  isToolEnabled: vi.fn().mockImplementation((name: string) => name !== 'update_document'),
};

vi.mock('@/core/mcp-tool-auth', () => ({
  MCPToolAuthManager: vi.fn(() => mockToolAuthManager),
}));

const originalEnv = process.env;

describe('TC-4.4: Admin MCP Router', () => {
  let adminMCP: any;

  beforeEach(async () => {
    mockMCPClient.isConnected.mockReturnValue(true);
    mockMCPClient.healthCheck.mockResolvedValue(true);
    mockMCPClient.getTools.mockReturnValue([
      {
        name: 'read_document',
        description: '读取飞书文档内容',
        inputSchema: { type: 'object', properties: { document_id: { type: 'string' } }, required: ['document_id'] },
        fallbackMethod: 'feishu.docx.document.get',
      },
      {
        name: 'create_document',
        description: '创建飞书文档',
        inputSchema: { type: 'object', properties: { parent_token: { type: 'string' }, title: { type: 'string' } }, required: ['parent_token', 'title'] },
        fallbackMethod: 'feishu.docx.document.create',
      },
    ]);
    mockToolAuthManager.getAllToolAuths.mockReturnValue([
      { toolName: 'read_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.get' },
      { toolName: 'create_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.create' },
      { toolName: 'search_wiki_or_drive', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.search' },
      { toolName: 'update_document', enabled: false, fallbackEnabled: false },
    ]);
    mockToolAuthManager.getToolAuth.mockImplementation((name: string) => {
      const auths: Record<string, any> = {
        read_document: { toolName: 'read_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.get' },
        create_document: { toolName: 'create_document', enabled: true, fallbackEnabled: true, fallbackMethod: 'feishu.docx.document.create' },
        update_document: { toolName: 'update_document', enabled: false, fallbackEnabled: false },
      };
      return auths[name] || null;
    });

    process.env = { ...originalEnv };
    delete process.env.ADMIN_API_KEY;

    const { initMCPAdminRouter } = await import('../../src/routers/admin-mcp');
    const mockDb = {} as any;
    adminMCP = initMCPAdminRouter(mockDb, mockToolAuthManager as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('TC-4.4-001: GET /mcp/status', () => {
    it('should return connection status with connected=true', async () => {
      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/status');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty('connected');
      expect(body).toHaveProperty('fallbackEnabled');
      expect(body).toHaveProperty('serverUrl');
      expect(typeof body.connected).toBe('boolean');
      expect(typeof body.fallbackEnabled).toBe('boolean');
      expect(typeof body.serverUrl).toBe('string');
    });

    it('should return connected=false when MCP client is not connected', async () => {
      mockMCPClient.isConnected.mockReturnValueOnce(false);

      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/status');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.connected).toBe(false);
    });
  });

  describe('TC-4.4-002: GET /mcp/tools', () => {
    it('should return list of tools with availableInMCP flag', async () => {
      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/tools');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty('tools');
      expect(Array.isArray(body.tools)).toBe(true);
      expect(body.tools.length).toBeGreaterThan(0);

      for (const tool of body.tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('availableInMCP');
        expect(typeof tool.availableInMCP).toBe('boolean');
      }
    });

    it('should include tool auth status in response', async () => {
      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/tools');
      const body = await res.json();

      expect(res.status).toBe(200);
      for (const tool of body.tools) {
        expect(tool).toHaveProperty('enabled');
        expect(tool).toHaveProperty('fallbackEnabled');
      }
    });
  });

  describe('TC-4.4-003: PUT /mcp/tools/:name', () => {
    it('should update tool auth and return success=true', async () => {
      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/tools/read_document', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
    });

    it('should return 400 when fallbackEnabled is sent (not supported)', async () => {
      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/tools/create_document', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fallbackEnabled: false }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent tool', async () => {
      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/tools/non_existent_tool', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('TC-4.4-004: GET /mcp/health', () => {
    it('should return health status with toolsLoaded count', async () => {
      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/health');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty('healthy');
      expect(body).toHaveProperty('connected');
      expect(body).toHaveProperty('toolsLoaded');
      expect(typeof body.healthy).toBe('boolean');
      expect(typeof body.connected).toBe('boolean');
      expect(typeof body.toolsLoaded).toBe('number');
    });

    it('should return healthy=false when not connected', async () => {
      mockMCPClient.isConnected.mockReturnValueOnce(false);
      mockMCPClient.healthCheck.mockResolvedValueOnce(false);
      mockMCPClient.getTools.mockReturnValueOnce([]);

      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/health');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.healthy).toBe(false);
      expect(body.connected).toBe(false);
    });
  });

  describe('Authentication with ADMIN_API_KEY', () => {
    it('should allow requests without API key when ADMIN_API_KEY is not set', async () => {
      const app = new Hono();
      app.route('/api/admin/mcp', adminMCP);

      const res = await app.request('/api/admin/mcp/status');

      expect(res.status).toBe(200);
    });
  });
});
