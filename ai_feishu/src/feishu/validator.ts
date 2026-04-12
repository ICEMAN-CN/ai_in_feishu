import { createHmac, timingSafeEqual } from 'crypto';

function getVerificationToken(): string {
  return process.env.FEISHU_VERIFICATION_TOKEN || '';
}

export function verifyFeishuSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const token = getVerificationToken();
  if (!token) {
    return true;
  }

  const str = timestamp + body;
  const expectedSig = createHmac('sha256', token)
    .update(str)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch {
    return false;
  }
}

export function isValidTimestamp(timestamp: string): boolean {
  const now = Date.now();
  const ts = parseInt(timestamp, 10) * 1000;
  
  if (isNaN(ts)) {
    return false;
  }
  
  const diff = Math.abs(now - ts);
  return diff < 5 * 60 * 1000;
}
