import { Client } from '@larksuiteoapi/node-sdk';
import { logger } from '../core/logger';

export interface FallbackConfig {
  enabled: boolean;
  useNativeAPI: boolean;
}

interface DocumentResponse {
  document?: {
    document_id?: string;
    title?: string;
    content?: unknown;
  };
}

interface SearchResponse {
  data?: {
    items?: SearchResultItem[];
  };
}

interface SearchResultItem {
  document_id?: string;
  title?: string;
  snippet?: string;
}

export class MCPFallbackService {
  private client: Client;
  private config: FallbackConfig;

  constructor(client: Client, config?: Partial<FallbackConfig>) {
    this.client = client;
    this.config = {
      enabled: config?.enabled ?? true,
      useNativeAPI: config?.useNativeAPI ?? true,
    };
  }

  async readDocument(documentId: string): Promise<string> {
    try {
      const response = await this.client.docx.v1.document.get({
        path: { document_id: documentId },
      });

      const doc = response.data as DocumentResponse;
      if (!doc?.document?.content) {
        return '';
      }
      return JSON.stringify(doc.document.content, null, 2);
    } catch (error) {
      logger.error('MCPFallbackService', `readDocument failed for ${documentId}:`, error);
      throw error;
    }
  }

  async createDocument(
    parentToken: string,
    title: string,
    content: string
  ): Promise<{ documentId: string; url: string }> {
    try {
      const createResponse = await (this.client.docx.v1.document.create as Function)({
        data: { folder_token: parentToken, title },
      });

      const documentId = (createResponse as any).data?.document?.document_id;
      if (!documentId) {
        throw new Error('Failed to create document: no document_id returned');
      }

      await (this.client.docx.v1.document.rawContent as any).update({
        path: { document_id: documentId },
        data: {
          content: JSON.stringify([{
            block_type: 2,
            block_id: 'p1',
            text: { elements: [{ text_run: { content } }] },
          }]),
        },
      });

      return { documentId, url: `https://xxx.feishu.cn/docx/${documentId}` };
    } catch (error) {
      logger.error('MCPFallbackService', `createDocument failed:`, error);
      throw error;
    }
  }

  async search(query: string, count: number = 5): Promise<SearchResultItem[]> {
    try {
      const response = await (this.client.search as any).v1.message.search({
        data: { query, message_type: ['docx'], count },
      });

      const searchResponse = response as SearchResponse;
      return searchResponse.data?.items || [];
    } catch (error) {
      logger.error('MCPFallbackService', `search failed for query "${query}":`, error);
      throw error;
    }
  }
}

export {};