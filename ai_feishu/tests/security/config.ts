// Security Test Configuration
export const SECURITY_CONFIG = {
  // Encryption test patterns
  ENCRYPTION: {
    // Plaintext API key patterns that should NEVER appear in DB
    PLAINTEXT_PATTERNS: [
      /^sk-[a-zA-Z0-9]{20,}$/, // OpenAI format
      /^sk-ant-[a-zA-Z0-9]{20,}$/, // Anthropic format
      /^AI[a-zA-Z0-9]{20,}$/, // Generic AI key
    ],
    // Encrypted data should be valid JSON with these fields
    ENCRYPTED_FIELDS: ['ciphertext', 'iv', 'tag'],
  },

  // Signature verification test values
  SIGNATURE: {
    VALID_TOKEN: 'test-verification-token',
    INVALID_SIGNATURE: 'invalid-signature-12345',
    TIMESTAMP_TOLERANCE_MS: 5 * 60 * 1000, // 5 minutes
  },

  // SQL injection test payloads
  SQL_INJECTION: {
    PAYLOADS: [
      "' OR '1'='1",
      "'; DROP TABLE models;--",
      "' OR 1=1--",
      "admin'--",
      "1' AND '1'='1",
    ],
  },

  // XSS test payloads
  XSS: {
    PAYLOADS: [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<body onload=alert("XSS")>',
    ],
  },

  // Test timeout
  TIMEOUT_MS: 10000,
};
