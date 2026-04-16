import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MetricsCollector', () => {
  let consoleMock: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };
  let metricsCollector: {
    recordRequestStart: (requestId: string, type?: 'http' | 'streaming' | 'ws' | 'llm') => void;
    recordRequestEnd: (requestId: string) => void;
    recordStreamingFirstByte: (requestId: string, durationMs: number) => void;
    recordLLMToken: (durationMs: number) => void;
    recordWSConnect: (durationMs: number) => void;
    recordError: () => void;
    getStats: () => { p50: number; p95: number; p99: number; count: number; errors: number };
    reset: () => void;
  };

  beforeEach(async () => {
    vi.resetModules();
    consoleMock = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    const module = await import('@/core/metrics-logger');
    metricsCollector = module.MetricsCollector ? new module.MetricsCollector() : module.metrics;
    metricsCollector.reset();
  });

  afterEach(() => {
    consoleMock.log.mockRestore();
    consoleMock.warn.mockRestore();
    consoleMock.error.mockRestore();
  });

  it('1. recordRequestStart marks request start time', () => {
    metricsCollector.recordRequestStart('req-1');
    const stats = metricsCollector.getStats();
    expect(stats.count).toBe(0);
  });

  it('2. recordRequestEnd calculates duration and logs', () => {
    metricsCollector.recordRequestStart('req-1');
    metricsCollector.recordRequestEnd('req-1');
    const stats = metricsCollector.getStats();
    expect(stats.count).toBe(1);
    expect(consoleMock.log).toHaveBeenCalled();
  });

  it('3. recordRequestEnd calculates correct duration', async () => {
    vi.useFakeTimers();
    const { MetricsCollector } = await import('@/core/metrics-logger');
    const collector = new MetricsCollector();

    collector.recordRequestStart('req-timed');
    vi.advanceTimersByTime(100);
    collector.recordRequestEnd('req-timed');

    const stats = collector.getStats();
    expect(stats.count).toBe(1);
    expect(stats.p50).toBe(100);

    vi.useRealTimers();
  });

  it('4. recordStreamingFirstByte records duration', () => {
    metricsCollector.recordStreamingFirstByte('stream-1', 50);
    const stats = metricsCollector.getStats();
    expect(stats.count).toBe(1);
    expect(consoleMock.log).toHaveBeenCalled();
  });

  it('5. recordLLMToken records token generation time', () => {
    metricsCollector.recordLLMToken(30);
    const stats = metricsCollector.getStats();
    expect(stats.count).toBe(1);
  });

  it('6. recordWSConnect records WebSocket connection time', () => {
    metricsCollector.recordWSConnect(25);
    const stats = metricsCollector.getStats();
    expect(stats.count).toBe(1);
  });

  it('7. getStats returns correct p50 for single value', () => {
    metricsCollector.recordLLMToken(100);
    const stats = metricsCollector.getStats();
    expect(stats.p50).toBe(100);
  });

  it('8. getStats returns correct p50 for multiple values', () => {
    metricsCollector.recordLLMToken(10);
    metricsCollector.recordLLMToken(20);
    metricsCollector.recordLLMToken(30);
    metricsCollector.recordLLMToken(40);
    metricsCollector.recordLLMToken(50);
    const stats = metricsCollector.getStats();
    expect(stats.p50).toBe(30);
  });

  it('9. getStats returns correct p95', () => {
    for (let i = 1; i <= 100; i++) {
      metricsCollector.recordLLMToken(i);
    }
    const stats = metricsCollector.getStats();
    expect(stats.p95).toBe(95);
  });

  it('10. getStats returns correct p99', () => {
    for (let i = 1; i <= 100; i++) {
      metricsCollector.recordLLMToken(i);
    }
    const stats = metricsCollector.getStats();
    expect(stats.p99).toBe(99);
  });

  it('11. getStats returns correct count', () => {
    metricsCollector.recordLLMToken(10);
    metricsCollector.recordLLMToken(20);
    metricsCollector.recordLLMToken(30);
    const stats = metricsCollector.getStats();
    expect(stats.count).toBe(3);
  });

  it('12. recordError increments error count', () => {
    metricsCollector.recordError();
    metricsCollector.recordError();
    const stats = metricsCollector.getStats();
    expect(stats.errors).toBe(2);
  });

  it('13. getStats returns zero values when no metrics recorded', () => {
    const stats = metricsCollector.getStats();
    expect(stats.p50).toBe(0);
    expect(stats.p95).toBe(0);
    expect(stats.p99).toBe(0);
    expect(stats.count).toBe(0);
    expect(stats.errors).toBe(0);
  });

  it('14. concurrent requests are handled independently', async () => {
    vi.useFakeTimers();

    metricsCollector.recordRequestStart('req-a');
    metricsCollector.recordRequestStart('req-b');
    vi.advanceTimersByTime(50);
    metricsCollector.recordRequestEnd('req-a');
    vi.advanceTimersByTime(50);
    metricsCollector.recordRequestEnd('req-b');

    const stats = metricsCollector.getStats();
    expect(stats.count).toBe(2);

    vi.useRealTimers();
  });

  it('15. reset clears all metrics', () => {
    metricsCollector.recordLLMToken(100);
    metricsCollector.recordError();
    metricsCollector.reset();
    const stats = metricsCollector.getStats();
    expect(stats.count).toBe(0);
    expect(stats.errors).toBe(0);
  });

  it('16. logs structured JSON for analysis', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { MetricsCollector } = await import('@/core/metrics-logger');
    const mc = new MetricsCollector();
    mc.recordLLMToken(42);
    expect(logSpy).toHaveBeenCalled();
    const logArgs = logSpy.mock.calls[0];
    const jsonStr = logArgs[1] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.type).toBe('llm');
    expect(parsed.durationMs).toBe(42);
    expect(parsed.timestamp).toBeDefined();
    logSpy.mockRestore();
  });

  it('17. warn when ending non-existent request', () => {
    metricsCollector.recordRequestEnd('non-existent');
    expect(consoleMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('non-existent')
    );
  });
});