import { logger } from './logger';
export class MetricsCollector {
    requests = new Map();
    durations = [];
    errors = 0;
    recordRequestStart(requestId, type = 'http') {
        const metric = {
            startTime: Date.now(),
            type,
        };
        this.requests.set(requestId, metric);
        logger.debug('Metrics', `Request started: ${requestId} [${type}]`);
    }
    recordRequestEnd(requestId) {
        const metric = this.requests.get(requestId);
        if (!metric) {
            logger.warn('Metrics', `Request end recorded without start: ${requestId}`);
            return;
        }
        metric.endTime = Date.now();
        const durationMs = metric.endTime - metric.startTime;
        this.durations.push(durationMs);
        this.requests.delete(requestId);
        const logEntry = {
            requestId,
            type: metric.type,
            durationMs,
            timestamp: new Date().toISOString(),
        };
        logger.info('Metrics', `Request completed`, JSON.stringify(logEntry));
    }
    recordStreamingFirstByte(requestId, durationMs) {
        const metric = this.requests.get(requestId);
        const type = metric?.type || 'streaming';
        this.durations.push(durationMs);
        const logEntry = {
            requestId,
            type: 'streaming_first_byte',
            durationMs,
            timestamp: new Date().toISOString(),
        };
        logger.info('Metrics', `Streaming first byte`, JSON.stringify(logEntry));
    }
    recordLLMToken(durationMs) {
        this.durations.push(durationMs);
        const logEntry = {
            requestId: 'llm_token',
            type: 'llm',
            durationMs,
            timestamp: new Date().toISOString(),
        };
        logger.info('Metrics', `LLM token recorded`, JSON.stringify(logEntry));
    }
    recordWSConnect(durationMs) {
        this.durations.push(durationMs);
        const logEntry = {
            requestId: 'ws_connect',
            type: 'ws',
            durationMs,
            timestamp: new Date().toISOString(),
        };
        logger.info('Metrics', `WebSocket connect`, JSON.stringify(logEntry));
    }
    recordError() {
        this.errors++;
    }
    getStats() {
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
    calculatePercentile(arr, p) {
        if (arr.length === 0)
            return 0;
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
    }
    // For testing purposes
    reset() {
        this.requests.clear();
        this.durations = [];
        this.errors = 0;
    }
}
// Export singleton
export const metrics = new MetricsCollector();
//# sourceMappingURL=metrics-logger.js.map