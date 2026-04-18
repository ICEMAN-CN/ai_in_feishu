import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { verifyFeishuSignature, isValidTimestamp } from '../src/feishu/validator';

describe('validator', () => {
  const TEST_TOKEN = 'test-verification-token-12345';

  describe('verifyFeishuSignature()', () => {
    describe('when FEISHU_VERIFICATION_TOKEN is not configured', () => {
      const originalToken = process.env.FEISHU_VERIFICATION_TOKEN;

      beforeEach(() => {
        delete process.env.FEISHU_VERIFICATION_TOKEN;
      });

      afterEach(() => {
        if (originalToken !== undefined) {
          process.env.FEISHU_VERIFICATION_TOKEN = originalToken;
        }
      });

      it('should return false when token is not configured (security enforcement)', () => {
        const result = verifyFeishuSignature('{"test":"data"}', '1234567890', 'invalid-signature');
        expect(result).toBe(false);
      });
    });

    describe('when FEISHU_VERIFICATION_TOKEN is configured', () => {
      const originalToken = process.env.FEISHU_VERIFICATION_TOKEN;

      beforeEach(() => {
        process.env.FEISHU_VERIFICATION_TOKEN = TEST_TOKEN;
      });

      afterEach(() => {
        if (originalToken !== undefined) {
          process.env.FEISHU_VERIFICATION_TOKEN = originalToken;
        } else {
          delete process.env.FEISHU_VERIFICATION_TOKEN;
        }
      });

      it('should return true for valid signature', () => {
        const body = '{"message":"hello"}';
        const timestamp = '1234567890';
        const str = timestamp + body;
        const validSignature = createHmac('sha256', TEST_TOKEN)
          .update(str)
          .digest('hex');

        const result = verifyFeishuSignature(body, timestamp, validSignature);
        expect(result).toBe(true);
      });

      it('should return false for invalid signature', () => {
        const body = '{"message":"hello"}';
        const timestamp = '1234567890';
        const invalidSignature = 'a'.repeat(64);

        const result = verifyFeishuSignature(body, timestamp, invalidSignature);
        expect(result).toBe(false);
      });

      it('should return false for tampered body', () => {
        const originalBody = '{"message":"hello"}';
        const tamperedBody = '{"message":"hacked"}';
        const timestamp = '1234567890';
        const str = timestamp + originalBody;
        const signature = createHmac('sha256', TEST_TOKEN)
          .update(str)
          .digest('hex');

        const result = verifyFeishuSignature(tamperedBody, timestamp, signature);
        expect(result).toBe(false);
      });

      it('should return false for tampered timestamp', () => {
        const body = '{"message":"hello"}';
        const originalTimestamp = '1234567890';
        const tamperedTimestamp = '9999999999';
        const str = originalTimestamp + body;
        const signature = createHmac('sha256', TEST_TOKEN)
          .update(str)
          .digest('hex');

        const result = verifyFeishuSignature(body, tamperedTimestamp, signature);
        expect(result).toBe(false);
      });

      it('should return false for malformed signature', () => {
        const body = '{"message":"hello"}';
        const timestamp = '1234567890';
        const malformedSignature = 'not-hex-string';

        const result = verifyFeishuSignature(body, timestamp, malformedSignature);
        expect(result).toBe(false);
      });

      it('should return false for empty signature', () => {
        const body = '{"message":"hello"}';
        const timestamp = '1234567890';

        const result = verifyFeishuSignature(body, timestamp, '');
        expect(result).toBe(false);
      });
    });
  });

  describe('isValidTimestamp()', () => {
    it('should return true for current timestamp', () => {
      const currentTs = Math.floor(Date.now() / 1000).toString();
      expect(isValidTimestamp(currentTs)).toBe(true);
    });

    it('should return true for timestamp within 5 minutes', () => {
      const ts = Math.floor(Date.now() / 1000) - 60;
      expect(isValidTimestamp(ts.toString())).toBe(true);
    });

    it('should return false for timestamp older than 5 minutes', () => {
      const oldTs = Math.floor(Date.now() / 1000) - 400;
      expect(isValidTimestamp(oldTs.toString())).toBe(false);
    });

    it('should return false for future timestamp beyond 5 minutes', () => {
      const futureTs = Math.floor(Date.now() / 1000) + 400;
      expect(isValidTimestamp(futureTs.toString())).toBe(false);
    });

    it('should return true for timestamp at exact boundary (just under 5 min)', () => {
      const boundaryTs = Math.floor(Date.now() / 1000) - 299;
      expect(isValidTimestamp(boundaryTs.toString())).toBe(true);
    });

    it('should return false for timestamp at exact boundary (5 min)', () => {
      const boundaryTs = Math.floor(Date.now() / 1000) - 300;
      expect(isValidTimestamp(boundaryTs.toString())).toBe(false);
    });

    it('should return false for invalid timestamp string', () => {
      expect(isValidTimestamp('not-a-number')).toBe(false);
      expect(isValidTimestamp('')).toBe(false);
      expect(isValidTimestamp('NaN')).toBe(false);
    });

    it('should handle timestamp with leading zeros', () => {
      const ts = Math.floor(Date.now() / 1000);
      const tsWithLeadingZero = '0' + ts.toString();
      expect(isValidTimestamp(tsWithLeadingZero)).toBe(true);
    });
  });
});
