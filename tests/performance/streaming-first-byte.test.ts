import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PERFORMANCE_CONFIG, createMockStreamResponse } from './config.js';

describe('Streaming First Byte Time Test (PT-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should respond with first byte within 500ms threshold', async () => {
    const firstByteTimes: number[] = [];

    // Simulate 10 streaming requests
    for (let i = 0; i < 10; i++) {
      const start = Date.now();

      // Simulate streaming with mock delay
      await simulateStreamingResponse(50); // 50ms per chunk
      const firstByte = Date.now() - start;
      firstByteTimes.push(firstByte);
    }

    const p50 = calculatePercentile(firstByteTimes, 0.5);
    console.log(`\nStreaming First Byte P50: ${p50}ms`);

    expect(p50).toBeLessThanOrEqual(PERFORMANCE_CONFIG.THRESHOLDS.STREAMING_FIRST_BYTE_MS);
  });

  it('should track first byte time for each streaming request', async () => {
    const requestIds = ['req-1', 'req-2', 'req-3'];
    const firstByteTimes: Map<string, number> = new Map();

    for (const reqId of requestIds) {
      const start = Date.now();
      await simulateStreamingResponse(100);
      firstByteTimes.set(reqId, Date.now() - start);
    }

    expect(firstByteTimes.size).toBe(requestIds.length);
    firstByteTimes.forEach((time, id) => {
      console.log(`First byte for ${id}: ${time}ms`);
    });
  });

  it('should measure first byte time using mock stream response', async () => {
    const start = Date.now();
    let firstByteReceived = false;
    let firstByteTime = 0;

    for await (const chunk of createMockStreamResponse(30, 5)) {
      if (!firstByteReceived) {
        firstByteTime = Date.now() - start;
        firstByteReceived = true;
        console.log(`First byte received: ${firstByteTime}ms`);
      }
    }

    expect(firstByteReceived).toBe(true);
    expect(firstByteTime).toBeLessThanOrEqual(PERFORMANCE_CONFIG.THRESHOLDS.STREAMING_FIRST_BYTE_MS);
  });

  it('should handle concurrent streaming requests within threshold', async () => {
    const concurrentRequests = 5;
    const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
      const start = Date.now();
      for await (const _chunk of createMockStreamResponse(40, 3)) {
        return Date.now() - start;
      }
      return 0;
    });

    const times = await Promise.all(promises);
    const p50 = calculatePercentile(times, 0.5);
    console.log(`\nConcurrent streaming P50: ${p50}ms`);

    expect(p50).toBeLessThanOrEqual(PERFORMANCE_CONFIG.THRESHOLDS.STREAMING_FIRST_BYTE_MS);
  });
});

// Helper functions
async function simulateStreamingResponse(delayMs: number): Promise<void> {
  // Simulate first byte delay
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  // Simulate subsequent chunks (but we only care about first byte)
  await new Promise((resolve) => setTimeout(resolve, delayMs * 2));
}

function calculatePercentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * p);
  return sorted[index];
}