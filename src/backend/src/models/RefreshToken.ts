export interface RefreshToken {
  tokenId: string;
  userId: string;
  hashedToken: string;
  expiresAt: number;
  createdAt: string;
  revokedAt?: string;
}

