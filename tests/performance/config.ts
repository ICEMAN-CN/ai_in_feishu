import type { FeishuMessage } from '../../src/types/message.js';

export const PERFORMANCE_CONFIG = {
  THRESHOLDS: {
    P50_RESPONSE_TIME_MS: 2000,
    P95_RESPONSE_TIME_MS: 5000,
    STREAMING_FIRST_BYTE_MS: 500,
    MAX_CONCURRENT_WS: 100,
    MEMORY_GROWTH_THRESHOLD_MB: 100,
  },
  LOAD_TEST: {
    CONCURRENT_USERS: 10,
    DURATION_SECONDS: 30,
    WARMUP_SECONDS: 5,
  },
  TIMEOUTS: {
    HTTP_REQUEST_MS: 10000,
    WEBSOCKET_MS: 5000,
    STREAMING_MS: 60000,
  },
  PORTS: {
    CALLBACK: 3000,
    ADMIN: 3001,
  },
};

export async function* createMockStreamResponse(
  delayMs: number = 100,
  chunkCount: number = 10
): AsyncGenerator<string> {
  const baseContent = 'This is a mock LLM streaming response for performance testing. ';

  for (let i = 0; i < chunkCount; i++) {
    await sleep(delayMs);
    yield JSON.stringify({
      type: 'chunk',
      index: i,
      content: baseContent.substring(0, 20 + (i * 5) % 40),
      done: i === chunkCount - 1,
    });
  }
}

export function createMockFullResponse(delayMs: number = 500): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        JSON.stringify({
          type: 'full_response',
          content:
            'This is a mock full LLM response for performance testing. The system is functioning correctly.',
          model: 'mock-gpt-4',
          usage: {
            prompt_tokens: 50,
            completion_tokens: 150,
            total_tokens: 200,
          },
        })
      );
    }, delayMs);
  });
}

export function createMockFeishuMessage(overrides?: Partial<FeishuMessage>): FeishuMessage {
  const baseMessage: FeishuMessage = {
    message_id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    create_time: new Date().toISOString(),
    chat_id: `oc_chat_${Math.random().toString(36).substring(7)}`,
    chat_type: 'p2p',
    message_type: 'text',
    content: JSON.stringify({ text: 'Hello, this is a test message' }),
  };

  return { ...baseMessage, ...overrides };
}

export function createMockChatMessage(content: string): object {
  return {
    id: `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    role: 'user',
    content,
    timestamp: Date.now(),
    metadata: {
      source: 'feishu',
      streaming: false,
    },
  };
}

export function createMockMessageBatch(
  count: number,
  baseContent: string = 'Test message'
): FeishuMessage[] {
  return Array.from({ length: count }, (_, index) =>
    createMockFeishuMessage({
      content: JSON.stringify({ text: `${baseContent} #${index + 1}` }),
      create_time: new Date(Date.now() - (count - index) * 1000).toISOString(),
    })
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{
  result: T;
  durationMs: number;
}> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

export function createPerformanceMonitor() {
  const measurements: { name: string; durationMs: number; timestamp: number }[] = [];

  return {
    record: (name: string, durationMs: number) => {
      measurements.push({ name, durationMs, timestamp: Date.now() });
    },
    getMeasurements: () => [...measurements],
    clear: () => {
      measurements.length = 0;
    },
    getStats: (name: string) => {
      const filtered = measurements.filter((m) => m.name === name);
      if (filtered.length === 0) return null;

      const durations = filtered.map((m) => m.durationMs).sort((a, b) => a - b);
      return {
        count: durations.length,
        p50: durations[Math.floor(durations.length * 0.5)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: durations[0],
        max: durations[durations.length - 1],
      };
    },
  };
}
