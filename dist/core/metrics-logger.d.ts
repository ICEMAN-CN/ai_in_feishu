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
export declare class MetricsCollector {
    private requests;
    private durations;
    private errors;
    recordRequestStart(requestId: string, type?: RequestMetric['type']): void;
    recordRequestEnd(requestId: string): void;
    recordStreamingFirstByte(requestId: string, durationMs: number): void;
    recordLLMToken(durationMs: number): void;
    recordWSConnect(durationMs: number): void;
    recordError(): void;
    getStats(): MetricStats;
    private calculatePercentile;
    reset(): void;
}
export declare const metrics: MetricsCollector;
export {};
//# sourceMappingURL=metrics-logger.d.ts.map