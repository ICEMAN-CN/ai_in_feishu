import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { verifyFeishuSignature, isValidTimestamp } from '../../src/feishu/validator';

describe('SEC-002/003: Signature Verification', () => {
  const TEST_TOKEN = 'test-verification-token-12345';
  const TEST_BODY = JSON.stringify({ message: 'test', event_id: 'test-123' });

  describe('SEC-002: Signature verification with token configured', () => {
    beforeEach(() => {
      process.env.FEISHU_VERIFICATION_TOKEN = TEST_TOKEN;
    });

    afterEach(() => {
      delete process.env.FEISHU_VERIFICATION_TOKEN;
    });

    it('should reject invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const invalidSignature = 'invalid-signature-1234567890abcdef';

      const result = verifyFeishuSignature(TEST_BODY, timestamp, invalidSignature);

      expect(result).toBe(false);
    });

    it('should accept valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const str = timestamp + TEST_BODY;
      const validSignature = createHmac('sha256', TEST_TOKEN)
        .update(str)
        .digest('hex');

      const result = verifyFeishuSignature(TEST_BODY, timestamp, validSignature);

      expect(result).toBe(true);
    });

    it('should reject tampered body', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const str = timestamp + TEST_BODY;
      const validSignature = createHmac('sha256', TEST_TOKEN)
        .update(str)
        .digest('hex');

      // Tamper with body after signing
      const tamperedBody = JSON.stringify({ message: 'hacked', event_id: 'test-123' });
      const result = verifyFeishuSignature(tamperedBody, timestamp, validSignature);

      expect(result).toBe(false);
    });

    it('should accept valid signature for old timestamp when caller validates timestamp separately', () => {
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
      const str = oldTimestamp + TEST_BODY;
      const validSignature = createHmac('sha256', TEST_TOKEN)
        .update(str)
        .digest('hex');

      const result = verifyFeishuSignature(TEST_BODY, oldTimestamp, validSignature);

      expect(result).toBe(true);
    });

    it('should accept timestamp within tolerance', () => {
      // Timestamp from 1 minute ago (within 5 min tolerance)
      const validTimestamp = (Math.floor(Date.now() / 1000) - 60).toString();
      const str = validTimestamp + TEST_BODY;
      const validSignature = createHmac('sha256', TEST_TOKEN)
        .update(str)
        .digest('hex');

      const result = verifyFeishuSignature(TEST_BODY, validTimestamp, validSignature);

      expect(result).toBe(true);
    });
  });

  describe('SEC-003: Signature verification without token configured', () => {
    beforeEach(() => {
      delete process.env.FEISHU_VERIFICATION_TOKEN;
    });

    it('should reject verification when token not configured', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const validSignature = 'any-signature-would-normally-be-valid';

      const result = verifyFeishuSignature(TEST_BODY, timestamp, validSignature);

      // When token not set, verification is disabled and returns false
      // This enforces security by requiring explicit token configuration
      expect(result).toBe(false);
    });
  });

  describe('Timestamp validation', () => {
    it('should accept valid timestamp', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      expect(isValidTimestamp(timestamp)).toBe(true);
    });

    it('should reject future timestamp beyond tolerance', () => {
      // 10 minutes in future (beyond 5 min tolerance)
      const futureTimestamp = (Math.floor(Date.now() / 1000) + 600).toString();
      expect(isValidTimestamp(futureTimestamp)).toBe(false);
    });

    it('should reject invalid timestamp format', () => {
      expect(isValidTimestamp('not-a-number')).toBe(false);
      expect(isValidTimestamp('')).toBe(false);
    });
  });
});