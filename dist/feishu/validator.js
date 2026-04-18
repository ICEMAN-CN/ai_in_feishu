import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '../core/logger';
function getVerificationToken() {
    return process.env.FEISHU_VERIFICATION_TOKEN || '';
}
export function verifyFeishuSignature(body, timestamp, signature) {
    const token = getVerificationToken();
    if (!token) {
        // Token not configured - reject verification to enforce security
        logger.warn('Validator', 'FEISHU_VERIFICATION_TOKEN not set - signature verification disabled');
        return false;
    }
    const str = timestamp + body;
    const expectedSig = createHmac('sha256', token)
        .update(str)
        .digest('hex');
    try {
        return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
    }
    catch {
        return false;
    }
}
export function isValidTimestamp(timestamp) {
    const now = Date.now();
    const ts = parseInt(timestamp, 10) * 1000;
    if (isNaN(ts)) {
        return false;
    }
    const diff = Math.abs(now - ts);
    return diff < 5 * 60 * 1000;
}
//# sourceMappingURL=validator.js.map