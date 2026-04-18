import { Client } from '@larksuiteoapi/node-sdk';
export interface FallbackConfig {
    enabled: boolean;
    useNativeAPI: boolean;
}
interface SearchResultItem {
    document_id?: string;
    title?: string;
    snippet?: string;
}
export declare class MCPFallbackService {
    private client;
    private config;
    constructor(client: Client, config?: Partial<FallbackConfig>);
    readDocument(documentId: string): Promise<string>;
    createDocument(parentToken: string, title: string, content: string): Promise<{
        documentId: string;
        url: string;
    }>;
    search(query: string, count?: number): Promise<SearchResultItem[]>;
}
export {};
//# sourceMappingURL=mcp-fallback.d.ts.map