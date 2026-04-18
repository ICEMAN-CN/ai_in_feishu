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
//# sourceMappingURL=token.d.ts.map