import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeishuDocService } from '../src/services/feishu-doc';

const mockClient = {
  drive: {
    v1: {
      folder: {
        getChildren: vi.fn(),
      },
    },
  },
  docx: {
    v1: {
      document: {
        get: vi.fn(),
        rawContent: {
          get: vi.fn(),
        },
      },
    },
  },
};

describe('FeishuDocService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDocumentsInFolder', () => {
    it('TC-5.2-001: should return documents list from folder', async () => {
      mockClient.drive.v1.folder.getChildren.mockResolvedValue({
        data: {
          items: [
            { token: 'doc1', title: 'Document 1' },
            { token: 'doc2', title: 'Document 2' },
          ],
        },
      });

      const service = new FeishuDocService(mockClient as any);
      const docs = await service.listDocumentsInFolder('folder123');

      expect(docs).toHaveLength(2);
      expect(docs[0]).toEqual({ documentId: 'doc1', title: 'Document 1' });
      expect(docs[1]).toEqual({ documentId: 'doc2', title: 'Document 2' });
    });

    it('should return empty array when no items', async () => {
      mockClient.drive.v1.folder.getChildren.mockResolvedValue({
        data: { items: [] },
      });

      const service = new FeishuDocService(mockClient as any);
      const docs = await service.listDocumentsInFolder('emptyFolder');

      expect(docs).toHaveLength(0);
    });

    it('should filter items without token or title', async () => {
      mockClient.drive.v1.folder.getChildren.mockResolvedValue({
        data: {
          items: [
            { token: 'doc1', title: 'Document 1' },
            { token: null, title: 'No Token' },
            { token: 'doc2', title: null },
            { token: 'doc3', title: 'Document 3' },
          ],
        },
      });

      const service = new FeishuDocService(mockClient as any);
      const docs = await service.listDocumentsInFolder('folder123');

      expect(docs).toHaveLength(2);
      expect(docs[0].documentId).toBe('doc1');
      expect(docs[1].documentId).toBe('doc3');
    });
  });

  describe('getDocument', () => {
    it('TC-5.2-002: should return document content and title', async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        data: {
          document: { title: 'Test Doc' },
        },
      });

      mockClient.docx.v1.document.rawContent.get.mockResolvedValue({
        data: [
          { text: { elements: [{ text_run: { content: 'Hello' } }] } },
        ],
      });

      const service = new FeishuDocService(mockClient as any);
      const doc = await service.getDocument('doc123');

      expect(doc.documentId).toBe('doc123');
      expect(doc.title).toBe('Test Doc');
      expect(doc.content).toBe('Hello');
    });

    it('TC-5.2-003: should return empty string for empty blocks', async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        data: { document: { title: 'Empty Doc' } },
      });

      mockClient.docx.v1.document.rawContent.get.mockResolvedValue({
        data: null,
      });

      const service = new FeishuDocService(mockClient as any);
      const doc = await service.getDocument('doc123');

      expect(doc.content).toBe('');
    });

    it('should use Untitled when no title provided', async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        data: { document: {} },
      });

      mockClient.docx.v1.document.rawContent.get.mockResolvedValue({
        data: [],
      });

      const service = new FeishuDocService(mockClient as any);
      const doc = await service.getDocument('doc123');

      expect(doc.title).toBe('Untitled');
    });
  });

  describe('extractTextFromBlock', () => {
    it('should extract text from text block', () => {
      const service = new FeishuDocService(mockClient as any);
      const block = {
        text: {
          elements: [
            { text_run: { content: 'Hello ' } },
            { text_run: { content: 'World' } },
          ],
        },
      };

      expect(service.extractTextFromBlock(block)).toBe('Hello World');
    });

    it('should extract text from heading1 block', () => {
      const service = new FeishuDocService(mockClient as any);
      const block = {
        heading1: {
          elements: [{ text_run: { content: 'Heading 1' } }],
        },
      };

      expect(service.extractTextFromBlock(block)).toBe('Heading 1');
    });

    it('should extract text from heading2 block', () => {
      const service = new FeishuDocService(mockClient as any);
      const block = {
        heading2: {
          elements: [{ text_run: { content: 'Heading 2' } }],
        },
      };

      expect(service.extractTextFromBlock(block)).toBe('Heading 2');
    });

    it('should extract text from heading3 block', () => {
      const service = new FeishuDocService(mockClient as any);
      const block = {
        heading3: {
          elements: [{ text_run: { content: 'Heading 3' } }],
        },
      };

      expect(service.extractTextFromBlock(block)).toBe('Heading 3');
    });

    it('should extract text from list block', () => {
      const service = new FeishuDocService(mockClient as any);
      const block = {
        list: {
          elements: [{ text_run: { content: 'List item' } }],
        },
      };

      expect(service.extractTextFromBlock(block)).toBe('List item');
    });

    it('should return empty string for unrecognized block type', () => {
      const service = new FeishuDocService(mockClient as any);
      const block = {
        unknown: { elements: [{ text_run: { content: 'Should not extract' } }] },
      };

      expect(service.extractTextFromBlock(block)).toBe('');
    });

    it('should return empty string for null block', () => {
      const service = new FeishuDocService(mockClient as any);
      expect(service.extractTextFromBlock(null)).toBe('');
    });

    it('should handle block with empty elements', () => {
      const service = new FeishuDocService(mockClient as any);
      const block = {
        text: { elements: [] },
      };

      expect(service.extractTextFromBlock(block)).toBe('');
    });
  });
});