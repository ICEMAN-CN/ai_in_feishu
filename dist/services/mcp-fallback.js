import { logger } from '../core/logger';
export class MCPFallbackService {
    client;
    config;
    constructor(client, config) {
        this.client = client;
        this.config = {
            enabled: config?.enabled ?? true,
            useNativeAPI: config?.useNativeAPI ?? true,
        };
    }
    async readDocument(documentId) {
        try {
            const response = await this.client.docx.v1.document.get({
                path: { document_id: documentId },
            });
            const doc = response.data;
            if (!doc?.document?.content) {
                return '';
            }
            return JSON.stringify(doc.document.content, null, 2);
        }
        catch (error) {
            logger.error('MCPFallbackService', `readDocument failed for ${documentId}:`, error);
            throw error;
        }
    }
    async createDocument(parentToken, title, content) {
        try {
            const createResponse = await this.client.docx.v1.document.create({
                data: { folder_token: parentToken, title },
            });
            const documentId = createResponse.data?.document?.document_id;
            if (!documentId) {
                throw new Error('Failed to create document: no document_id returned');
            }
            await this.client.docx.v1.document.rawContent.update({
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
        }
        catch (error) {
            logger.error('MCPFallbackService', `createDocument failed:`, error);
            throw error;
        }
    }
    async search(query, count = 5) {
        try {
            const response = await this.client.search.v1.message.search({
                data: { query, message_type: ['docx'], count },
            });
            const searchResponse = response;
            return searchResponse.data?.items || [];
        }
        catch (error) {
            logger.error('MCPFallbackService', `search failed for query "${query}":`, error);
            throw error;
        }
    }
}
//# sourceMappingURL=mcp-fallback.js.map