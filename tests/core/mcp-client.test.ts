import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPClient, MCPClientConfig } from '@/core/mcp-client';

describe('MCPClient', () => {
  let client: MCPClient;
  
  const defaultConfig: MCPClientConfig = {
    serverUrl: 'http://localhost:3001',
    serverToken: 'test-token',
    timeout: 5000,
    retryAttempts: 3,
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    client = new MCPClient(defaultConfig);
  });
  
  // TC-4.1-001: Constructor initializes correctly
  it('TC-4.1-001: constructor sets initial state', () => {
    expect(client.isConnected()).toBe(false);
    expect(client.getTools()).toEqual([]);
    expect(client.getConfig().serverUrl).toBe(defaultConfig.serverUrl);
  });
  
  // TC-4.1-002: connect() should set connected=true
  it('TC-4.1-002: connect() sets connected=true', async () => {
    // Mock fetch to succeed
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    } as any);
    
    await client.connect();
    expect(client.isConnected()).toBe(true);
  });
  
  // TC-4.1-003: disconnect() should set connected=false
  it('TC-4.1-003: disconnect() sets connected=false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    } as any);
    
    await client.connect();
    client.disconnect();
    expect(client.isConnected()).toBe(false);
  });
  
  // TC-4.1-004: loadTools() should load mock tools
  it('TC-4.1-004: loadTools() loads 3 mock tools', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    await client.loadTools();
    expect(client.getTools().length).toBe(3);
    expect(client.hasTool('read_document')).toBe(true);
    expect(client.hasTool('create_document')).toBe(true);
    expect(client.hasTool('search_wiki_or_drive')).toBe(true);
  });
  
  // TC-4.1-005: getTool() returns correct tool
  it('TC-4.1-005: getTool() returns correct tool details', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    await client.loadTools();
    const tool = client.getTool('read_document');
    expect(tool?.name).toBe('read_document');
    expect(tool?.description).toBe('读取飞书文档内容');
  });
  
  // TC-4.1-006: callTool() throws when tool not found (checked before connection)
  it('TC-4.1-006: callTool() throws when tool not found', async () => {
    await expect(client.callTool('read_document', { document_id: '123' }))
      .rejects.toThrow('Tool not found');
  });
  
  // TC-4.1-007: callTool() throws when tool not found
  it('TC-4.1-007: callTool() throws when tool not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    } as any);
    
    await client.connect();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await client.loadTools();
    await expect(client.callTool('nonexistent_tool', {}))
      .rejects.toThrow('Tool not found');
  });
  
  // TC-4.1-008: Event emission on connect
  it('TC-4.1-008: emits connected event', async () => {
    const connectedHandler = vi.fn();
    client.on('connected', connectedHandler);
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    } as any);
    
    await client.connect();
    expect(connectedHandler).toHaveBeenCalled();
  });
  
  // TC-4.1-009: Singleton functions work
  it('TC-4.1-009: singleton functions work', async () => {
    const { initMCPClient, getMCPClient, destroyMCPClient } = await import('@/core/mcp-client');
    
    const instance = initMCPClient(defaultConfig);
    expect(getMCPClient()).toBe(instance);
    
    destroyMCPClient();
    expect(getMCPClient()).toBeNull();
  });
  
  // TC-4.1-010: callWithFallback returns success result
  it('TC-4.1-010: callWithFallback returns success when tool works', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    } as any);
    
    await client.connect();
    
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await client.loadTools();
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        jsonrpc: '2.0', 
        id: 3, 
        result: { data: 'test result' } 
      }),
    } as any);
    
    const result = await client.callWithFallback('read_document', { document_id: '123' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('test result');
  });
});