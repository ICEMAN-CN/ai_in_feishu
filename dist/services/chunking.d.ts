export interface TextChunk {
    text: string;
    tokenCount: number;
    chunkIndex: number;
}
export declare class ChunkingService {
    private textSplitter;
    constructor();
    /**
     * Splits a document into chunks with filtering.
     *
     * @param text - The full text content of the document
     * @param metadata - Document metadata (unused in current implementation, reserved for future use)
     * @returns Promise resolving to an array of valid TextChunk objects
     */
    chunkDocument(text: string, metadata: {
        documentId: string;
        title: string;
        url: string;
    }): Promise<TextChunk[]>;
    /**
     * Estimates the token count for a given text.
     * Uses a simple character-based approximation:
     * - Chinese characters: 0.5 tokens each
     * - English/symbols: 0.25 tokens each
     *
     * @param text - The text to estimate tokens for
     * @returns Estimated token count (rounded up)
     */
    private estimateTokens;
}
export {};
//# sourceMappingURL=chunking.d.ts.map