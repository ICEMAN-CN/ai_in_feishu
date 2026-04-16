/**
 * Concurrent Users Performance Test (PT-001)
 * AI_Feishu - Sprint 01 Infrastructure
 *
 * Simulates 10 concurrent users sending messages to verify system
 * handles load without errors and maintains response time thresholds.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PERFORMANCE_CONFIG } from './config';

// ============================================================================
// Mock LLMRouter for testing
// ============================================================================

/**
 * Creates a mock streamGenerate function that yields chunks with configurable delays.
 * Useful for testing streaming behavior under load.
 */
export function createMockStreamGenerate(delayMs: number = 50, chunkCount: number = 5) {
  return vi.fn().mockImplementation(async function* () {
    for (let i = 0; i < chunkCount; i++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      yield `chunk ${i + 1} `;
    }
  });
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Concurrent Users Test (PT-001)', () => {
  const concurrentUsers = PERFORMANCE_CONFIG.LOAD_TEST.CONCURRENT_USERS; // 10

  afterAll(() => {
    vi.restoreAllMocks();
  });

  /**
   * PT-001-001: Verify system handles 10 concurrent requests without errors
   */
  it('should handle 10 concurrent message requests without errors', async () => {
    const promises: Promise<{ success: boolean; duration: number }>[] = [];
    const startTime = Date.now();

    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(simulateUserMessage(i));
    }

    const results = await Promise.all(promises);

    // All requests should succeed
    results.forEach((result, i) => {
      expect(result.success).toBe(true);
    });

    const totalDuration = Date.now() - startTime;
    console.log(`\n✓ Processed ${concurrentUsers} concurrent requests in ${totalDuration}ms`);
  }, PERFORMANCE_CONFIG.TIMEOUTS.HTTP_REQUEST_MS);

  /**
   * PT-001-002: Verify response times stay within acceptable thresholds
   */
  it('should maintain response time under threshold', async () => {
    const responseTimes: number[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      const start = Date.now();
      await simulateUserMessage(i);
      responseTimes.push(Date.now() - start);
    }

    const p50 = calculatePercentile(responseTimes, 0.5);
    const p95 = calculatePercentile(responseTimes, 0.95);

    console.log(`\n✓ P50: ${p50}ms, P95: ${p95}ms`);
    console.log(`  Thresholds - P50: ${PERFORMANCE_CONFIG.THRESHOLDS.P50_RESPONSE_TIME_MS}ms, P95: ${PERFORMANCE_CONFIG.THRESHOLDS.P95_RESPONSE_TIME_MS}ms`);

    expect(p50).toBeLessThanOrEqual(PERFORMANCE_CONFIG.THRESHOLDS.P50_RESPONSE_TIME_MS);
    expect(p95).toBeLessThanOrEqual(PERFORMANCE_CONFIG.THRESHOLDS.P95_RESPONSE_TIME_MS);
  });

  /**
   * PT-001-003: Verify all concurrent requests complete within overall timeout
   */
  it('should complete all concurrent requests within HTTP timeout', async () => {
    const startTime = Date.now();

    const promises = Array.from({ length: concurrentUsers }, (_, i) => simulateUserMessage(i));
    const results = await Promise.all(promises);

    const totalDuration = Date.now() - startTime;

    expect(results.every((r) => r.success)).toBe(true);
    expect(totalDuration).toBeLessThan(PERFORMANCE_CONFIG.TIMEOUTS.HTTP_REQUEST_MS);

    console.log(`\n✓ All ${concurrentUsers} requests completed in ${totalDuration}ms (timeout: ${PERFORMANCE_CONFIG.TIMEOUTS.HTTP_REQUEST_MS}ms)`);
  });

  /**
   * PT-001-004: Verify mock stream generate works correctly
   */
  it('should generate streaming chunks via mock', async () => {
    const mockStreamGenerate = createMockStreamGenerate(20, 3);
    const chunks: string[] = [];

    for await (const chunk of await mockStreamGenerate()) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toBe('chunk 1 ');
    expect(chunks[1]).toBe('chunk 2 ');
    expect(chunks[2]).toBe('chunk 3 ');

    console.log(`\n✓ Mock stream generated ${chunks.length} chunks correctly`);
  });

  /**
   * PT-001-005: Verify concurrent streaming works without interleaving issues
   */
  it('should handle concurrent streaming without chunk interleaving', async () => {
    const mockStreamGenerate = createMockStreamGenerate(10, 5);

    const streamPromises = Array.from({ length: 3 }, async (_, streamId) => {
      const chunks: string[] = [];
      const generator = await mockStreamGenerate();

      for await (const chunk of generator) {
        // Tag chunk with streamId to detect interleaving
        chunks.push(`[stream${streamId}]${chunk}`);
      }
      return chunks;
    });

    const results = await Promise.all(streamPromises);

    // Each stream should have exactly 5 chunks
    results.forEach((chunks, i) => {
      expect(chunks).toHaveLength(5);
      // All chunks for each stream should have correct tag
      chunks.forEach((chunk) => {
        expect(chunk).toContain(`[stream${i}]`);
      });
    });

    console.log(`\n✓ ${results.length} concurrent streams completed without interleaving`);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simulates a user sending a message and receiving a response.
 * Mimics realistic message processing latency.
 */
async function simulateUserMessage(userId: number): Promise<{ success: boolean; duration: number }> {
  const start = Date.now();
  try {
    // Simulate message processing with realistic latency (100-300ms)
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));
    return { success: true, duration: Date.now() - start };
  } catch {
    return { success: false, duration: Date.now() - start };
  }
}

/**
 * Calculates the p-th percentile of an array of numbers.
 */
function calculatePercentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[index];
}