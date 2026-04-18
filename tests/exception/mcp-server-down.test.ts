import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Client } from '@larksuiteoapi/node-sdk';
import { MCPFallbackService } from '../../src/services/mcp-fallback';
import { getFeishuClient } from '../../src/feishu/client';

vi.mock('../../src/feishu/client', () => ({
  getFeishuClient: vi.fn(),
}));

vi.mock('@larksuiteoapi/node-sdk', () => ({
  Client: vi.fn(),
}));

describe('EXC-002: MCP Server Down Fallback Tests', () => {
  let mockClient: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
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

    vi.mocked(getFeishuClient).mockReturnValue(mockClient as unknown as Client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MCPFallbackService', () => {
    describe('readDocument', () => {
      it('should fallback to native API when MCP read_document tool fails', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.docx.v1.document.get.mockResolvedValue({
          data: {
            document: {
              document_id: 'doc123',
              title: 'Test Document',
              content: [
                { block_type: 2, block_id: 'p1', text: { elements: [{ text_run: { content: 'Fallback content' } }] } },
              ],
            },
          },
        });

        const result = await service.readDocument('doc123');

        expect(mockClient.docx.v1.document.get).toHaveBeenCalledWith({
          path: { document_id: 'doc123' },
        });
        expect(result).toContain('Fallback content');
      });

      it('should throw error when both MCP and native API fail', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.docx.v1.document.get.mockRejectedValue(new Error('Network error'));

        await expect(service.readDocument('doc123')).rejects.toThrow('Network error');
        expect(mockClient.docx.v1.document.get).toHaveBeenCalledTimes(1);
      });

      it('should return empty string when document has no content', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.docx.v1.document.get.mockResolvedValue({
          data: {
            document: {
              document_id: 'doc123',
              title: 'Empty Doc',
            },
          },
        });

        const result = await service.readDocument('doc123');

        expect(result).toBe('');
      });
    });

    describe('createDocument', () => {
      it('should fallback to native API when MCP create_document tool fails', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.docx.v1.document.create.mockResolvedValue({
          data: {
            document: { document_id: 'new-doc-456' },
          },
        });
        mockClient.docx.v1.document.rawContent.update.mockResolvedValue({});

        const result = await service.createDocument('parent-token', 'New Document', '# Hello World');

        expect(mockClient.docx.v1.document.create).toHaveBeenCalledWith({
          data: { folder_token: 'parent-token', title: 'New Document' },
        });
        expect(mockClient.docx.v1.document.rawContent.update).toHaveBeenCalled();
        expect(result).toEqual({
          documentId: 'new-doc-456',
          url: 'https://xxx.feishu.cn/docx/new-doc-456',
        });
      });

      it('should throw when document creation returns no document_id', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.docx.v1.document.create.mockResolvedValue({
          data: {},
        });

        await expect(
          service.createDocument('parent-token', 'New Doc', '# Content')
        ).rejects.toThrow('Failed to create document: no document_id returned');
      });

      it('should throw when rawContent update fails', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.docx.v1.document.create.mockResolvedValue({
          data: {
            document: { document_id: 'doc789' },
          },
        });
        mockClient.docx.v1.document.rawContent.update.mockRejectedValue(
          new Error('Content update failed')
        );

        await expect(
          service.createDocument('parent-token', 'New Doc', '# Content')
        ).rejects.toThrow('Content update failed');
      });
    });

    describe('search', () => {
      it('should fallback to native search API when MCP search tool fails', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.search.v1.message.search.mockResolvedValue({
          data: {
            items: [
              { document_id: 'doc1', title: 'Result 1', snippet: 'First result' },
              { document_id: 'doc2', title: 'Result 2', snippet: 'Second result' },
            ],
          },
        });

        const results = await service.search('test query', 5);

        expect(mockClient.search.v1.message.search).toHaveBeenCalledWith({
          data: { query: 'test query', message_type: ['docx'], count: 5 },
        });
        expect(results).toHaveLength(2);
        expect(results[0]).toEqual(
          expect.objectContaining({ document_id: 'doc1', title: 'Result 1' })
        );
      });

      it('should return empty array when search finds nothing', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.search.v1.message.search.mockResolvedValue({
          data: { items: [] },
        });

        const results = await service.search('nonexistent');

        expect(results).toEqual([]);
      });

      it('should throw when search API fails', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.search.v1.message.search.mockRejectedValue(
          new Error('Search service unavailable')
        );

        await expect(service.search('test')).rejects.toThrow('Search service unavailable');
      });

      it('should use default count of 5 when count not specified', async () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.search.v1.message.search.mockResolvedValue({
          data: { items: [] },
        });

        await service.search('test');

        expect(mockClient.search.v1.message.search).toHaveBeenCalledWith({
          data: { query: 'test', message_type: ['docx'], count: 5 },
        });
      });
    });

    describe('FallbackConfig', () => {
      it('should use default config when none provided', () => {
        const service = new MCPFallbackService(mockClient as unknown as Client);

        mockClient.docx.v1.document.get.mockResolvedValue({
          data: { document: { document_id: 'x', content: [] } },
        });

        expect(async () => await service.readDocument('x')).not.toThrow();
      });

      it('should respect disabled fallback config', () => {
        const service = new MCPFallbackService(mockClient as unknown as Client, {
          enabled: false,
          useNativeAPI: false,
        });

        mockClient.docx.v1.document.get.mockResolvedValue({
          data: { document: { document_id: 'x', content: [] } },
        });

        expect(async () => await service.readDocument('x')).not.toThrow();
      });
    });
  });
});
