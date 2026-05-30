import { Request, Response } from 'express';
import UserService from '../services/UserService';
import JWTService from '../services/JWTService';
import DynamoDBService from '../services/DynamoDBService';
import { v4 as uuidv4 } from 'uuid';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshTokenRequest {
  refreshTokenId: string;
}

interface RefreshTokenRecord {
  tokenId: string;
  userId: string;
  hashedToken: string;
  expiresAt: number;
  createdAt: string;
  revokedAt?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshTokenId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body as RegisterRequest;

      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const user = await UserService.createUser({
        email,
        password,
        firstName,
        lastName,
      });

      const accessToken = JWTService.generateAccessToken(
        user.userId,
        user.email,
        user.tokenVersion,
      );

      const refreshToken = JWTService.generateRefreshToken();
      const refreshTokenId = uuidv4();

      await DynamoDBService.put(
        process.env.REFRESH_TOKENS_TABLE || 'refreshTokens',
        {
          tokenId: refreshTokenId,
          userId: user.userId,
          hashedToken: refreshToken.hashedToken,
          expiresAt: refreshToken.expiresAt,
          createdAt: new Date().toISOString(),
        }
      );

      const response: AuthResponse = {
        accessToken,
        refreshTokenId,
        user: {
          id: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(400).json({ error: error.message || 'Registration failed' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      const user = await UserService.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const passwordValid = await UserService.verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const accessToken = JWTService.generateAccessToken(
        user.userId,
        user.email,
        user.tokenVersion,
      );

      const refreshToken = JWTService.generateRefreshToken();
      const refreshTokenId = uuidv4();

      await DynamoDBService.put(
        process.env.REFRESH_TOKENS_TABLE || 'refreshTokens',
        {
          tokenId: refreshTokenId,
          userId: user.userId,
          hashedToken: refreshToken.hashedToken,
          expiresAt: refreshToken.expiresAt,
          createdAt: new Date().toISOString(),
        }
      );

      const response: AuthResponse = {
        accessToken,
        refreshTokenId,
        user: {
          id: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };

      res.json(response);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message || 'Login failed' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshTokenId } = req.body as { refreshTokenId?: string };

      if (!refreshTokenId) {
        res.status(400).json({ error: 'Refresh token ID required' });
        return;
      }

      // Mark token as revoked
      await DynamoDBService.update(
        process.env.REFRESH_TOKENS_TABLE || 'refreshTokens',
        { tokenId: refreshTokenId },
        { revokedAt: new Date().toISOString() }
      );

      res.json({ message: 'Logout successful' });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(400).json({ error: error.message || 'Logout failed' });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshTokenId } = req.body as RefreshTokenRequest;

      if (!refreshTokenId) {
        res.status(400).json({ error: 'Refresh token ID required' });
        return;
      }

      // Get refresh token from DynamoDB
      const tokenRecord = await DynamoDBService.get(
        process.env.REFRESH_TOKENS_TABLE || 'refreshTokens',
        { tokenId: refreshTokenId }
      );

      if (!tokenRecord) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      const token = tokenRecord as RefreshTokenRecord;

      // Check if revoked
      if (token.revokedAt) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }

      // Check if expired
      if (Date.now() > token.expiresAt * 1000) {
        res.status(401).json({ error: 'Refresh token expired' });
        return;
      }

      // Get user to verify they still exist
      const user = await DynamoDBService.get(
        process.env.USERS_TABLE || 'users',
        { userId: token.userId }
      );

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      const userData = user as any;

      // Generate new access token
      const accessToken = JWTService.generateAccessToken(
        userData.userId,
        userData.email,
        userData.tokenVersion,
      );

      const response: AuthResponse = {
        accessToken,
        refreshTokenId,
        user: {
          id: userData.userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      };

      res.json(response);
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: error.message || 'Token refresh failed' });
    }
  }
}

export default new AuthController();