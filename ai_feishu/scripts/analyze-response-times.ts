import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface TimingEntry {
  timestamp: string;
  type: 'http' | 'streaming' | 'ws' | 'llm';
  duration?: number;
  requestId?: string;
}

export function parseLogFile(filepath: string): TimingEntry[] {
  const content = readFileSync(filepath, 'utf-8');
  const entries: TimingEntry[] = [];

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.metric && parsed.metric.type) {
        entries.push(parsed.metric);
      }
    } catch (_e) {}
  }
}

export function getLogFiles(logDir: string = './logs'): string[] {
  try {
    return readdirSync(logDir)
      .filter((f) => f.endsWith('.log'))
      .map((f) => join(logDir, f));
  } catch {
    return [];
  }
}

export function calculatePercentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * p);
  return sorted[Math.min(index, sorted.length - 1)];
}

export function calculateStats(durations: number[]) {
  if (durations.length === 0) {
    return { count: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, mean: 0 };
  }

  const sum = durations.reduce((a, b) => a + b, 0);
  return {
    count: durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
    p50: calculatePercentile(durations, 0.5),
    p95: calculatePercentile(durations, 0.95),
    p99: calculatePercentile(durations, 0.99),
    mean: Math.round(sum / durations.length),
  };
}

interface ThresholdConfig {
  P50_RESPONSE_TIME_MS: number;
  P95_RESPONSE_TIME_MS: number;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  P50_RESPONSE_TIME_MS: 2000,
  P95_RESPONSE_TIME_MS: 5000,
};

function main() {
  console.log('=== Response Time Analysis ===\n');

  const logFiles = getLogFiles();

  if (logFiles.length === 0) {
    console.log('No log files found in ./logs directory');
    console.log('Run the server with LOG_LEVEL=DEBUG to generate timing logs');
    return;
  }

  const allEntries: TimingEntry[] = [];
  for (const file of logFiles) {
    console.log(`Processing: ${file}`);
    allEntries.push(...parseLogFile(file));
  }

  const httpDurations = allEntries
    .filter((e) => e.type === 'http' && e.duration)
    .map((e) => e.duration!);
  const streamingDurations = allEntries
    .filter((e) => e.type === 'streaming' && e.duration)
    .map((e) => e.duration!);
  const wsDurations = allEntries
    .filter((e) => e.type === 'ws' && e.duration)
    .map((e) => e.duration!);

  console.log('\n--- HTTP Response Times ---');
  const httpStats = calculateStats(httpDurations);
  console.log(`Count: ${httpStats.count}`);
  console.log(`Mean: ${httpStats.mean}ms`);
  console.log(`Min: ${httpStats.min}ms`);
  console.log(`Max: ${httpStats.max}ms`);
  console.log(`P50: ${httpStats.p50}ms`);
  console.log(`P95: ${httpStats.p95}ms`);
  console.log(`P99: ${httpStats.p99}ms`);

  if (streamingDurations.length > 0) {
    console.log('\n--- Streaming Response Times ---');
    const streamingStats = calculateStats(streamingDurations);
    console.log(`Count: ${streamingStats.count}`);
    console.log(`Mean: ${streamingStats.mean}ms`);
    console.log(`P50: ${streamingStats.p50}ms`);
    console.log(`P95: ${streamingStats.p95}ms`);
    console.log(`P99: ${streamingStats.p99}ms`);
  }

  if (wsDurations.length > 0) {
    console.log('\n--- WebSocket Response Times ---');
    const wsStats = calculateStats(wsDurations);
    console.log(`Count: ${wsStats.count}`);
    console.log(`Mean: ${wsStats.mean}ms`);
    console.log(`P50: ${wsStats.p50}ms`);
    console.log(`P95: ${wsStats.p95}ms`);
    console.log(`P99: ${wsStats.p99}ms`);
  }

  const THRESHOLDS = DEFAULT_THRESHOLDS;
  let hasFailure = false;

  console.log('\n--- Threshold Checks ---');
  console.log(`P50 threshold: ${THRESHOLDS.P50_RESPONSE_TIME_MS}ms`);
  console.log(`P95 threshold: ${THRESHOLDS.P95_RESPONSE_TIME_MS}ms`);

  if (httpStats.count > 0) {
    if (httpStats.p50 > THRESHOLDS.P50_RESPONSE_TIME_MS) {
      console.log(
        `❌ P50 ${httpStats.p50}ms exceeds threshold ${THRESHOLDS.P50_RESPONSE_TIME_MS}ms`
      );
      hasFailure = true;
    }

    if (httpStats.p95 > THRESHOLDS.P95_RESPONSE_TIME_MS) {
      console.log(
        `❌ P95 ${httpStats.p95}ms exceeds threshold ${THRESHOLDS.P95_RESPONSE_TIME_MS}ms`
      );
      hasFailure = true;
    }
  }

  if (!hasFailure) {
    console.log('\n✅ All metrics within thresholds');
  }
}

main();