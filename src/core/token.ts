/**
 * Simple token generation for admin API authentication
 * Uses opaque token format: timestamp:randomBytes (base64 encoded)
 * Tokens expire after 24 hours
 */

import { randomBytes } from 'crypto';

export interface TokenData {
  token: string;
  expiresAt: number;
}

export function generateToken(): TokenData {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const timestamp = expiresAt.toString(36);
  const random = Buffer.from(randomBytes(16)).toString('base64url');
  const token = `${timestamp}:${random}`;
  return { token, expiresAt };
}

export function isTokenValid(expiresAt: number): boolean {
  return Date.now() < expiresAt;
}

/**
 * True if `candidate` matches the opaque session format from {@link generateToken}
 * (base36(expiresAt):base64url). Used by admin routers after browser login.
 */
export function isValidAdminSessionToken(candidate: string): boolean {
  const i = candidate.indexOf(':');
  if (i <= 0 || i === candidate.length - 1) return false;
  const expiryPart = candidate.slice(0, i);
  const randomPart = candidate.slice(i + 1);
  if (randomPart.length < 8) return false;
  const expiresAt = parseInt(expiryPart, 36);
  if (!Number.isFinite(expiresAt)) return false;
  const now = Date.now();
  if (expiresAt <= now) return false;
  // Tokens are issued with ~24h TTL; reject wildly future values
  if (expiresAt > now + 25 * 60 * 60 * 1000) return false;
  return true;
}
