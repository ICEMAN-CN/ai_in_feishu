/**
 * Simple token generation for admin API authentication
 * Uses opaque token format: timestamp:randomBytes (base64 encoded)
 * Tokens expire after 24 hours
 */
import { randomBytes } from 'crypto';
export function generateToken() {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const timestamp = expiresAt.toString(36);
    const random = Buffer.from(randomBytes(16)).toString('base64url');
    const token = `${timestamp}:${random}`;
    return { token, expiresAt };
}
export function isTokenValid(expiresAt) {
    return Date.now() < expiresAt;
}
//# sourceMappingURL=token.js.map