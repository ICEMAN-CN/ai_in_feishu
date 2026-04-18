export class FeishuDocService {
    client;
    constructor(client) {
        this.client = client;
    }
    // 获取文件夹下的文档列表
    async listDocumentsInFolder(folderToken) {
        try {
            const response = await this.client.drive.v1.folder.getChildren({
                path: { folder_token: folderToken },
            });
            const items = response.data.items || [];
            return items
                .filter((item) => item.token && item.title)
                .map((item) => ({
                documentId: item.token,
                title: item.title,
            }));
        }
        catch (error) {
            console.error('[FeishuDoc] listDocumentsInFolder failed:', error);
            throw error;
        }
    }
    // 获取单个文档内容
    async getDocument(documentId) {
        try {
            // 获取文档元数据
            const metaResponse = await this.client.docx.v1.document.get({
                path: { document_id: documentId },
            });
            const title = metaResponse.data?.document?.title || 'Untitled';
            // 获取文档内容
            const contentResponse = await this.client.docx.v1.document.rawContent.get({
                path: { document_id: documentId },
            });
            // 解析内容块
            const content = this.parseContentBlocks(contentResponse.data);
            return {
                documentId,
                title,
                content,
                updatedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('[FeishuDoc] getDocument failed:', error);
            throw error;
        }
    }
    // 解析飞书文档块为纯文本
    parseContentBlocks(blocks) {
        if (!blocks || !Array.isArray(blocks)) {
            return '';
        }
        const texts = [];
        for (const block of blocks) {
            const text = this.extractTextFromBlock(block);
            if (text) {
                texts.push(text);
            }
        }
        return texts.join('\n\n');
    }
    // 提取单个块中的文本
    extractTextFromBlock(block) {
        if (!block)
            return '';
        // 处理文本块
        if (block.text?.elements) {
            return block.text.elements
                .map((el) => el.text_run?.content || '')
                .join('');
        }
        // 处理标题块
        if (block.heading1?.elements || block.heading2?.elements || block.heading3?.elements) {
            const heading = block.heading1 || block.heading2 || block.heading3;
            return heading.elements
                .map((el) => el.text_run?.content || '')
                .join('');
        }
        // 处理列表块
        if (block.list?.elements) {
            return block.list.elements
                .map((el) => el.text_run?.content || '')
                .join('');
        }
        return '';
    }
}
//# sourceMappingURL=feishu-doc.js.map