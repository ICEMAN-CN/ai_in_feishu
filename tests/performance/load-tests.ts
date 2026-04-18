import autocannon from 'autocannon';
import { PERFORMANCE_CONFIG } from './config';

interface AutocannonResult {
  requests: number;
  duration: number;
  throughput: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
    [key: string]: number;
  };
  errors: number;
  timeouts: number;
}

export async function runHTTPLoadTest(): Promise<AutocannonResult> {
  const result = await autocannon({
    url: `http://localhost:${PERFORMANCE_CONFIG.PORTS.CALLBACK}/health`,
    connections: PERFORMANCE_CONFIG.LOAD_TEST.CONCURRENT_USERS,
    duration: PERFORMANCE_CONFIG.LOAD_TEST.DURATION_SECONDS,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return result as AutocannonResult;
}

export async function runCallbackLoadTest(): Promise<AutocannonResult> {
  const mockPayload = {
    schema: '2.0',
    header: {
      event_id: 'test_event_id',
      event_type: 'im.message.receive_v1',
      create_time: new Date().toISOString(),
      token: 'test_token',
      app_id: 'test_app_id',
      tenant_key: 'test_tenant',
    },
    event: {
      sender: {
        sender_id: { open_id: 'test_open_id' },
        sender_type: 'user',
        tenant_key: 'test_tenant',
      },
      message: {
        message_id: 'test_message_id',
        root_id: 'test_root_id',
        parent_id: 'test_parent_id',
        create_time: new Date().toISOString(),
        chat_id: 'test_chat_id',
        chat_type: 'p2p',
        message_type: 'text',
        content: JSON.stringify({ text: 'test' }),
      },
    },
  };

  return autocannon({
    url: `http://localhost:${PERFORMANCE_CONFIG.PORTS.CALLBACK}/feishu`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mockPayload),
    connections: PERFORMANCE_CONFIG.LOAD_TEST.CONCURRENT_USERS,
    duration: PERFORMANCE_CONFIG.LOAD_TEST.DURATION_SECONDS,
  }) as Promise<AutocannonResult>;
}

export function printResults(result: AutocannonResult): void {
  console.log('\n=== Load Test Results ===');
  console.log(`Requests: ${result.requests}`);
  console.log(`Duration: ${result.duration}s`);
  console.log(`Throughput: ${result.throughput} bytes/s`);
  console.log(`Latency P50: ${result.latency.p50}ms`);
  console.log(`Latency P95: ${result.latency.p95}ms`);
  console.log(`Latency P99: ${result.latency.p99}ms`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);
}

async function main() {
  console.log('Starting HTTP Load Tests...\n');

  console.log('Testing /health endpoint...');
  const healthResult = await runHTTPLoadTest();
  printResults(healthResult);

  const { THRESHOLDS } = PERFORMANCE_CONFIG;
  if (healthResult.latency.p50 > THRESHOLDS.P50_RESPONSE_TIME_MS) {
    console.error(`❌ P50 latency ${healthResult.latency.p50}ms exceeds threshold ${THRESHOLDS.P50_RESPONSE_TIME_MS}ms`);
    process.exit(1);
  }

  console.log('\n✅ All load tests passed!');
}

main().catch(console.error);