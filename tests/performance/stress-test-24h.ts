interface StressTestConfig {
  durationHours: number;
  messagesPerMinute: number;
  enableMemorySnapshots: boolean;
  gcIntervalMinutes: number;
}

const DEFAULT_CONFIG: StressTestConfig = {
  durationHours: 24,
  messagesPerMinute: 10,
  enableMemorySnapshots: true,
  gcIntervalMinutes: 10,
};

class StressTest24h {
  private config: StressTestConfig;
  private startTime: Date;
  private messageCount = 0;
  private errorCount = 0;
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: Partial<StressTestConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();
  }

  async start(): Promise<void> {
    console.log('=== Starting 24-Hour Stress Test ===');
    console.log(`Duration: ${this.config.durationHours} hours`);
    console.log(`Messages/minute: ${this.config.messagesPerMinute}`);
    console.log(`Memory snapshots: ${this.config.enableMemorySnapshots ? 'enabled' : 'disabled'}`);
    console.log(`GC trigger interval: ${this.config.gcIntervalMinutes} minutes\n`);

    this.running = true;

    // Calculate interval between messages
    const intervalMs = (60 * 1000) / this.config.messagesPerMinute;

    // Start message generation loop
    this.intervalId = setInterval(async () => {
      if (!this.running) return;

      try {
        await this.generateMessage();
        this.messageCount++;

        // Periodic status
        if (this.messageCount % 100 === 0) {
          this.printStatus();
        }
      } catch (error) {
        this.errorCount++;
        console.error(`Error: ${error}`);
      }
    }, intervalMs);

    // Memory snapshot interval
    if (this.config.enableMemorySnapshots) {
      setInterval(() => {
        this.takeMemorySnapshot();
        this.triggerGC();
      }, this.config.gcIntervalMinutes * 60 * 1000);
    }

    // Schedule test end
    const durationMs = this.config.durationHours * 60 * 60 * 1000;
    setTimeout(() => this.stop(), durationMs);
  }

  stop(): void {
    console.log('\n=== Stopping Stress Test ===');
    this.running = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.printFinalReport();
  }

  private async generateMessage(): Promise<void> {
    // Simulate message processing with realistic delays
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    // Simulate occasional slow responses
    if (Math.random() < 0.05) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private takeMemorySnapshot(): void {
    const mem = process.memoryUsage();
    console.log(JSON.stringify({
      stress_test: {
        type: 'memory_snapshot',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        messageCount: this.messageCount,
        errorCount: this.errorCount,
        memory: {
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
          rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
        }
      }
    }));
  }

  private triggerGC(): void {
    if (global.gc) {
      console.log(JSON.stringify({
        stress_test: {
          type: 'gc_trigger',
          timestamp: new Date().toISOString(),
          messageCount: this.messageCount,
        }
      }));
      global.gc();
    }
  }

  private printStatus(): void {
    const elapsed = Date.now() - this.startTime.getTime();
    const elapsedHours = elapsed / (60 * 60 * 1000);
    const rate = this.messageCount / elapsedHours;

    console.log(`\n[Status] ${elapsedHours.toFixed(1)}h | Messages: ${this.messageCount} | Rate: ${rate.toFixed(1)}/h | Errors: ${this.errorCount}`);
  }

  private printFinalReport(): void {
    const duration = Date.now() - this.startTime.getTime();
    const durationHours = duration / (60 * 60 * 1000);
    const mem = process.memoryUsage();

    console.log('\n=== Final Report ===');
    console.log(`Duration: ${durationHours.toFixed(2)} hours`);
    console.log(`Total Messages: ${this.messageCount}`);
    console.log(`Total Errors: ${this.errorCount}`);
    console.log(`Error Rate: ${((this.errorCount / this.messageCount) * 100).toFixed(2)}%`);
    console.log(`\nMemory (final):`);
    console.log(`  Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
    console.log(`  Heap Total: ${Math.round(mem.heapTotal / 1024 / 1024)}MB`);
    console.log(`  RSS: ${Math.round(mem.rss / 1024 / 1024)}MB`);
  }
}

// For short test runs (validation)
async function runShortTest(): Promise<void> {
  console.log('Running 1-minute stress test for validation...\n');

  const test = new StressTest24h({
    durationHours: 1 / 60, // 1 minute
    messagesPerMinute: 60, // 1 per second
    enableMemorySnapshots: true,
    gcIntervalMinutes: 1,
  });

  await test.start();

  // Let it run for 1 minute
  await new Promise(resolve => setTimeout(resolve, 60000));
  test.stop();
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--short')) {
  runShortTest().catch(console.error);
} else {
  console.log('Starting 24-hour stress test...');
  console.log('Use --short flag for a 1-minute validation test\n');

  const test = new StressTest24h();
  test.start();

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    test.stop();
    process.exit(0);
  });
}