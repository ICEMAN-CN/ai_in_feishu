// Exception Handling Test Configuration

export const EXC_CONFIG = {
  // EXC-001: WebSocket disconnect scenarios
  WEBSOCKET_DISCONNECT: {
    CODE: 'EXC-001',
    SCENARIOS: [
      { reason: 'Server shutdown', expectedReconnect: true },
      { reason: 'Network interruption', expectedReconnect: false },
      { reason: 'Heartbeat timeout', expectedReconnect: true },
    ],
  },

  // EXC-002: MCP server down scenarios
  MCP_SERVER_DOWN: {
    CODE: 'EXC-002',
    SCENARIOS: [
      { endpoint: 'http://localhost:3001', statusCode: 503, message: 'Service Unavailable' },
      { endpoint: 'http://localhost:3001', statusCode: 504, message: 'Gateway Timeout' },
      { endpoint: 'http://invalid:9999', error: 'ECONNREFUSED' },
    ],
  },

  // EXC-003: LLM API timeout scenarios
  LLM_API_TIMEOUT: {
    CODE: 'EXC-003',
    SCENARIOS: [
      { provider: 'openai', timeout: 30000, expectedRetry: true },
      { provider: 'anthropic', timeout: 60000, expectedRetry: true },
      { provider: 'gemini', timeout: 5000, expectedRetry: false },
    ],
  },

  // EXC-004: Feishu doc permission denied
  FEISHU_PERMISSION_DENIED: {
    CODE: 'EXC-004',
    SCENARIOS: [
      { docType: 'wiki', permission: 'read', errorCode: 12310301 },
      { docType: 'docx', permission: 'write', errorCode: 12310302 },
      { docType: 'sheet', permission: 'admin', errorCode: 12310303 },
    ],
  },

  // EXC-005: Vector DB query failure
  VECTOR_DB_QUERY_FAILURE: {
    CODE: 'EXC-005',
    SCENARIOS: [
      { errorType: 'connection', collection: 'documents' },
      { errorType: 'timeout', collection: 'embeddings' },
      { errorType: 'invalid_query', collection: 'documents' },
      { errorType: 'corrupted_index', collection: 'embeddings' },
    ],
  },

  // EXC-006: API Key invalid
  API_KEY_INVALID: {
    CODE: 'EXC-006',
    SCENARIOS: [
      { provider: 'openai', error: 'Invalid API key' },
      { provider: 'anthropic', error: 'authentication_error' },
      { provider: 'feishu', error: 'invalid_app_access_token' },
    ],
  },

  // EXC-007: Sync timeout
  SYNC_TIMEOUT: {
    CODE: 'EXC-007',
    SCENARIOS: [
      { syncType: 'full', timeoutMs: 300000, expectedPartial: false },
      { syncType: 'incremental', timeoutMs: 60000, expectedPartial: true },
      { syncType: 'realtime', timeoutMs: 10000, expectedPartial: false },
    ],
  },

  // EXC-008: Storage full
  STORAGE_FULL: {
    CODE: 'EXC-008',
    SCENARIOS: [
      { path: '/data/lancedb', availableBytes: 0 },
      { path: '/data/lancedb', availableBytes: 1024 },
      { path: '/data/sqlite', availableBytes: 0 },
    ],
  },

  // EXC-009: Thread not exist
  THREAD_NOT_EXIST: {
    CODE: 'EXC-009',
    SCENARIOS: [
      { threadId: 'non-existent-thread-001' },
      { threadId: 'deleted-thread-002' },
      { threadId: 'expired-thread-003' },
    ],
  },

  // EXC-010: Network flash disconnect
  NETWORK_FLASH_DISCONNECT: {
    CODE: 'EXC-010',
    SCENARIOS: [
      { duration: 100, expectedRecovery: true },
      { duration: 5000, expectedRecovery: true },
      { duration: 30000, expectedRecovery: false },
    ],
  },

  // Test timeout
  TIMEOUT_MS: 10000,
};
