import { logger } from './logger';

interface RequestMetric {
  startTime: number;
  endTime?: number;
  type: 'http' | 'streaming' | 'ws' | 'llm';
}

interface MetricStats {
  p50: number;
  p95: number;
  p99: number;
  count: number;
  errors: number;
}

interface LoggedMetric {
  requestId: string;
  type: string;
  durationMs: number;
  timestamp: string;
}

export class MetricsCollector {
  private requests = new Map<string, RequestMetric>();
  private durations: number[] = [];
  private errors = 0;

  recordRequestStart(requestId: string, type: RequestMetric['type'] = 'http'): void {
    const metric: RequestMetric = {
      startTime: Date.now(),
      type,
    };
    this.requests.set(requestId, metric);
    logger.debug('Metrics', `Request started: ${requestId} [${type}]`);
  }

  recordRequestEnd(requestId: string): void {
    const metric = this.requests.get(requestId);
    if (!metric) {
      logger.warn('Metrics', `Request end recorded without start: ${requestId}`);
      return;
    }

    metric.endTime = Date.now();
    const durationMs = metric.endTime - metric.startTime;
    this.durations.push(durationMs);
    this.requests.delete(requestId);

    const logEntry: LoggedMetric = {
      requestId,
      type: metric.type,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    logger.info('Metrics', `Request completed`, JSON.stringify(logEntry));
  }

  recordStreamingFirstByte(requestId: string, durationMs: number): void {
    const metric = this.requests.get(requestId);
    const type = metric?.type || 'streaming';

    this.durations.push(durationMs);

    const logEntry: LoggedMetric = {
      requestId,
      type: 'streaming_first_byte',
      durationMs,
      timestamp: new Date().toISOString(),
    };

    logger.info('Metrics', `Streaming first byte`, JSON.stringify(logEntry));
  }

  recordLLMToken(durationMs: number): void {
    this.durations.push(durationMs);

    const logEntry: LoggedMetric = {
      requestId: 'llm_token',
      type: 'llm',
      durationMs,
      timestamp: new Date().toISOString(),
    };

    logger.info('Metrics', `LLM token recorded`, JSON.stringify(logEntry));
  }

  recordWSConnect(durationMs: number): void {
    this.durations.push(durationMs);

    const logEntry: LoggedMetric = {
      requestId: 'ws_connect',
      type: 'ws',
      durationMs,
      timestamp: new Date().toISOString(),
    };

    logger.info('Metrics', `WebSocket connect`, JSON.stringify(logEntry));
  }

  recordError(): void {
    this.errors++;
  }

  getStats(): MetricStats {
    const sorted = [...this.durations].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      count,
      errors: this.errors,
    };
  }

  private calculatePercentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  }

  // For testing purposes
  reset(): void {
    this.requests.clear();
    this.durations = [];
    this.errors = 0;
  }
}

// Export singleton
export const metrics = new MetricsCollector();