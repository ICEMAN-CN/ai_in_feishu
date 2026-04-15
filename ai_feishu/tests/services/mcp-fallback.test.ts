import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockClient = {
  docx: {
    v1: {
      document: {
        get: vi.fn(),
        create: vi.fn(),
        rawContent: {
          update: vi.fn(),
        },
      },
    },
  },
  search: {
    v1: {
      message: {
        search: vi.fn(),
      },
    },
  },
};

vi.mock('@larksuiteoapi/node-sdk', () => ({
  Client: vi.fn(() => mockClient),
}));

describe('MCPFallbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockClient.docx.v1.document.get.mockResolvedValue({
      data: {
        document: {
          document_id: 'doc123',
          title: 'Test Document',
          content: [{ block_type: 2, text: 'Hello world' }],
        },
      },
    });

    mockClient.docx.v1.document.create.mockResolvedValue({
      data: {
        document: { document_id: 'doc456' },
      },
    });

    mockClient.docx.v1.document.rawContent.update.mockResolvedValue({});
  });

  it('TC-4.3-001: readDocument succeeds and returns document content as markdown string', async () => {
    const { MCPFallbackService } = require('@/services/mcp-fallback');
    const service = new MCPFallbackService(mockClient);

    const result = await service.readDocument('doc123');

    expect(mockClient.docx.v1.document.get).toHaveBeenCalledWith({
      path: { document_id: 'doc123' },
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('Hello world');
  });

  it('TC-4.3-002: createDocument succeeds and returns documentId and url', async () => {
    const { MCPFallbackService } = require('@/services/mcp-fallback');
    const service = new MCPFallbackService(mockClient);

    const result = await service.createDocument('parent_token', 'New Doc', '# Hello');

    expect(mockClient.docx.v1.document.create).toHaveBeenCalledWith({
      data: {
        folder_token: 'parent_token',
        title: 'New Doc',
      },
    });
    expect(mockClient.docx.v1.document.rawContent.update).toHaveBeenCalled();
    expect(result).toHaveProperty('documentId', 'doc456');
    expect(result).toHaveProperty('url');
    expect(result.url).toContain('doc456');
  });
});
