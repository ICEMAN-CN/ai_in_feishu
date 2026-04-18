import { Client } from '@larksuiteoapi/node-sdk';
export interface FeishuDocument {
    documentId: string;
    title: string;
    content: string;
    updatedAt: string;
}
export declare class FeishuDocService {
    private client;
    constructor(client: Client);
    listDocumentsInFolder(folderToken: string): Promise<Array<{
        documentId: string;
        title: string;
    }>>;
    getDocument(documentId: string): Promise<FeishuDocument>;
    private parseContentBlocks;
    extractTextFromBlock(block: any): string;
}
//# sourceMappingURL=feishu-doc.d.ts.map