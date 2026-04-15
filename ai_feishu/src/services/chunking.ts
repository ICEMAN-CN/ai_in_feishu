import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const KB_CHUNK_SIZE = parseInt(process.env.KB_CHUNK_SIZE || '500');
const KB_CHUNK_OVERLAP = parseInt(process.env.KB_CHUNK_OVERLAP || '50');

export interface TextChunk {
  text: string;
  tokenCount: number;
  chunkIndex: number;
}

export class ChunkingService {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: KB_CHUNK_SIZE,
      chunkOverlap: KB_CHUNK_OVERLAP,
      separators: ['\n\n', '\n', '。', '！', '？', '.', '!', '?', ' ', ''],
    });
  }

  /**
   * Splits a document into chunks with filtering.
   *
   * @param text - The full text content of the document
   * @param metadata - Document metadata (unused in current implementation, reserved for future use)
   * @returns Promise resolving to an array of valid TextChunk objects
   */
  async chunkDocument(
    text: string,
    metadata: { documentId: string; title: string; url: string }
  ): Promise<TextChunk[]> {
    // Split the document using the configured TextSplitter
    const splits = await this.textSplitter.splitText(text);

    // Filter out empty chunks
    const nonEmptySplits = splits.filter((s: string) => s.trim().length > 0);

    // Filter out chunks that are too short (less than 100 characters)
    const validSplits = nonEmptySplits.filter((s: string) => s.length >= 100);

    // Build chunks with token counts and indices
    const chunks: TextChunk[] = validSplits.map((split: string, index: number) => ({
      text: split,
      tokenCount: this.estimateTokens(split),
      chunkIndex: index,
    }));

    return chunks;
  }

  /**
   * Estimates the token count for a given text.
   * Uses a simple character-based approximation:
   * - Chinese characters: 0.5 tokens each
   * - English/symbols: 0.25 tokens each
   *
   * @param text - The text to estimate tokens for
   * @returns Estimated token count (rounded up)
   */
  private estimateTokens(text: string): number {
    let tokens = 0;
    for (const char of text) {
      if (char.charCodeAt(0) > 127) {
        tokens += 0.5; // Chinese characters
      } else {
        tokens += 0.25; // English/symbols
      }
    }
    return Math.ceil(tokens);
  }
}

export {};
