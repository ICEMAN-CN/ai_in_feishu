import { performance } from 'perf_hooks';

interface MemorySnapshot {
  timestamp: string;
  heapUsed: number;      // MB
  heapTotal: number;     // MB
  rss: number;           // MB
  external: number;      // MB
  arrayBuffers: number;  // MB
}

interface MemoryStats {
  count: number;
  growthMB: number;
  growthPercent: number;
  snapshots: MemorySnapshot[];
}

const THRESHOLD_MB = 100; // Max acceptable growth
const INTERVAL_MS = 5000; // Sample every 5 seconds
const MAX_SNAPSHOTS = 1000; // Keep last 1000 snapshots

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();

  start(): void {
    console.log('Starting memory monitor...');
    console.log(`Sampling every ${INTERVAL_MS}ms`);

    this.takeSnapshot(); // Initial snapshot

    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, INTERVAL_MS);
  }

  stop(): MemoryStats {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    return this.calculateStats();
  }

  private takeSnapshot(): void {
    const mem = process.memoryUsage();

    const snapshot: MemorySnapshot = {
      timestamp: new Date().toISOString(),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
      rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
      external: Math.round(mem.external / 1024 / 1024 * 100) / 100,
      arrayBuffers: mem.arrayBuffers
        ? Math.round(mem.arrayBuffers / 1024 / 1024 * 100) / 100
        : 0,
    };

    this.snapshots.push(snapshot);

    // Keep only last MAX_SNAPSHOTS
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    // Log as structured JSON for analysis
    console.log(JSON.stringify({ memory: snapshot }));
  }

  private calculateStats(): MemoryStats {
    if (this.snapshots.length < 2) {
      return { count: 0, growthMB: 0, growthPercent: 0, snapshots: [] };
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    const growthMB = last.heapUsed - first.heapUsed;
    const growthPercent = first.heapUsed > 0
      ? Math.round(growthMB / first.heapUsed * 10000) / 100
      : 0;

    return {
      count: this.snapshots.length,
      growthMB: Math.round(growthMB * 100) / 100,
      growthPercent,
      snapshots: this.snapshots,
    };
  }

  printReport(): void {
    const stats = this.calculateStats();

    console.log('\n=== Memory Report ===');
    console.log(`Duration: ${this.getDuration()}`);
    console.log(`Snapshots: ${stats.count}`);
    console.log(`Heap Growth: ${stats.growthMB}MB (${stats.growthPercent}%)`);

    if (stats.growthMB > THRESHOLD_MB) {
      console.log(`\n⚠️ WARNING: Memory growth ${stats.growthMB}MB exceeds threshold ${THRESHOLD_MB}MB`);
    } else {
      console.log('\n✅ Memory growth within acceptable range');
    }
  }

  private getDuration(): string {
    const now = new Date();
    const diff = now.getTime() - this.startTime.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}

// Main execution
function main() {
  const monitor = new MemoryMonitor();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down monitor...');
    monitor.stop();
    monitor.printReport();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\nShutting down monitor...');
    monitor.stop();
    monitor.printReport();
    process.exit(0);
  });

  monitor.start();

  // Keep running
  console.log('Press Ctrl+C to stop and get report');
}

main();