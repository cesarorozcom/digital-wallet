import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  tokenVersion: number;
  iat: number;
  exp: number;
  iss: string;
}

export interface RefreshTokenData {
  tokenId: string;
  userId: string;
  hashedToken: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
}

export class JWTService {
  private jwtSecret: string;
  private accessTokenExpiry: number;
  private refreshTokenExpiry: number;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-min-32-chars';
    this.accessTokenExpiry = parseInt(process.env.JWT_ACCESS_EXPIRY || '3600');
    this.refreshTokenExpiry = parseInt(process.env.JWT_REFRESH_EXPIRY || '604800');

    if (this.jwtSecret.length < 32) {
      console.warn('⚠️ JWT_SECRET is less than 32 characters. Use a stronger secret in production.');
    }
  }

  /**
   * Generate access token (1 hour expiration)
   */
  generateAccessToken(userId: string, email: string, tokenVersion: number = 0): string {
    const payload: AccessTokenPayload = {
      sub: userId,
      email,
      tokenVersion,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.accessTokenExpiry,
      iss: 'family-ledger',
    };

    return jwt.sign(payload, this.jwtSecret, { algorithm: 'HS256' });
  }

  /**
   * Generate refresh token data (7 day expiration)
   */
  generateRefreshToken(): RefreshTokenData {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry * 1000).toISOString();

    return {
      tokenId,
      userId: '', // Will be set by caller
      hashedToken: this.hashToken(tokenId),
      expiresAt,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Hash token for secure storage
   */
  hashToken(token: string): string {
    // In production, use bcrypt. For now, use simple hashing.
    return Buffer.from(token).toString('base64');
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as AccessTokenPayload;
      return decoded;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }
}

export default new JWTService();
