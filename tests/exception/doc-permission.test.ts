import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPFallbackService } from '@/services/mcp-fallback';

const mockClient = {
  docx: {
    v1: {
      document: {
        get: vi.fn(),
      },
    },
  },
};

vi.mock('@larksuiteoapi/node-sdk', () => ({
  Client: vi.fn(() => mockClient),
}));

describe('EXC-004: Document Permission Denied Error Handling', () => {
  let mcpFallbackService: MCPFallbackService;

  const TEST_DOCUMENT_ID = 'test-doc-permission-123';

  beforeEach(() => {
    vi.clearAllMocks();
    const { MCPFallbackService } = require('@/services/mcp-fallback');
    mcpFallbackService = new MCPFallbackService(mockClient as any);
  });

  describe('readDocument permission denied handling', () => {
    it('should throw Feishu permission denied error when document access fails', async () => {
      const permissionDeniedError = new Error('Permission denied: document not accessible');
      permissionDeniedError.name = 'FeishuAPIError';

      mockClient.docx.v1.document.get.mockRejectedValue(permissionDeniedError);

      await expect(mcpFallbackService.readDocument(TEST_DOCUMENT_ID)).rejects.toThrow(
        'Permission denied: document not accessible'
      );
    });

    it('should propagate FeishuAPIError with error code for permission denied', async () => {
      const apiError = new Error('Forbidden: insufficient permissions to access document');
      Object.defineProperty(apiError, 'code', { value: 403, enumerable: true });
      Object.defineProperty(apiError, 'status', { value: 403, enumerable: true });

      mockClient.docx.v1.document.get.mockRejectedValue(apiError);

      await expect(mcpFallbackService.readDocument(TEST_DOCUMENT_ID)).rejects.toThrow(
        'Forbidden: insufficient permissions to access document'
      );
    });

    it('should handle document not found error', async () => {
      const notFoundError = new Error('document not found');
      notFoundError.name = 'FeishuAPIError';

      mockClient.docx.v1.document.get.mockRejectedValue(notFoundError);

      await expect(mcpFallbackService.readDocument(TEST_DOCUMENT_ID)).rejects.toThrow(
        'document not found'
      );
    });

    it('should throw error for invalid document ID format', async () => {
      const invalidIdError = new Error('Invalid document ID');
      invalidIdError.name = 'FeishuAPIError';

      mockClient.docx.v1.document.get.mockRejectedValue(invalidIdError);

      await expect(mcpFallbackService.readDocument('invalid-id')).rejects.toThrow(
        'Invalid document ID'
      );
    });

    it('should handle network error during document read', async () => {
      const networkError = new Error('Network error: failed to fetch document');
      networkError.name = 'FetchError';

      mockClient.docx.v1.document.get.mockRejectedValue(networkError);

      await expect(mcpFallbackService.readDocument(TEST_DOCUMENT_ID)).rejects.toThrow(
        'Network error: failed to fetch document'
      );
    });

    it('should handle rate limit error during document read', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'FeishuAPIError';
      Object.defineProperty(rateLimitError, 'code', { value: 429, enumerable: true });

      mockClient.docx.v1.document.get.mockRejectedValue(rateLimitError);

      await expect(mcpFallbackService.readDocument(TEST_DOCUMENT_ID)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should throw original error without wrapping', async () => {
      const originalError = new Error('Permission denied');
      originalError.name = 'FeishuAPIError';

      mockClient.docx.v1.document.get.mockRejectedValue(originalError);

      try {
        await mcpFallbackService.readDocument(TEST_DOCUMENT_ID);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe('Permission denied');
        expect((error as Error).name).toBe('FeishuAPIError');
      }
    });
  });

  describe('error classification', () => {
    it('should identify permission denied error codes', async () => {
      const permissionError = new Error('Access denied');
      Object.defineProperty(permissionError, 'code', { value: 403, enumerable: true });

      mockClient.docx.v1.document.get.mockRejectedValue(permissionError);

      await expect(mcpFallbackService.readDocument(TEST_DOCUMENT_ID)).rejects.toThrow();
    });

    it('should handle authentication error', async () => {
      const authError = new Error('Authentication failed');
      Object.defineProperty(authError, 'code', { value: 401, enumerable: true });

      mockClient.docx.v1.document.get.mockRejectedValue(authError);

      await expect(mcpFallbackService.readDocument(TEST_DOCUMENT_ID)).rejects.toThrow(
        'Authentication failed'
      );
    });
  });
});
