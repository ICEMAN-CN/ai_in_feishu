/**
 * Simple token generation for admin API authentication
 * Uses opaque token format: timestamp:randomBytes (base64 encoded)
 * Tokens expire after 24 hours
 */
export interface TokenData {
    token: string;
    expiresAt: number;
}
export declare function generateToken(): TokenData;
export declare function isTokenValid(expiresAt: number): boolean;
/**
 * True if `candidate` matches the opaque session format from {@link generateToken}
 * (base36(expiresAt):base64url). Used by admin routers after browser login.
 */
export declare function isValidAdminSessionToken(candidate: string): boolean;
//# sourceMappingURL=token.d.ts.map