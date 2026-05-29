import { Request, Response } from 'express';
import userService from '../services/UserService';
import jwtService from '../services/JWTService';
import dynamoDBService from '../services/DynamoDBService';

export class AuthController {
  private refreshTokensTable = process.env.DYNAMODB_TABLE_REFRESH_TOKENS || 'RefreshTokens';

  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validate password strength
      const passwordValidation = userService.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        res.status(400).json({
          error: 'Password does not meet complexity requirements',
          details: passwordValidation.errors,
        });
        return;
      }

      // Create user
      const user = await userService.createUser({
        email,
        password,
        firstName,
        lastName,
      });

      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user.userId, user.email);
      const refreshTokenData = jwtService.generateRefreshToken();
      refreshTokenData.userId = user.userId;

      // Store refresh token
      await dynamoDBService.put(this.refreshTokensTable, refreshTokenData);

      res.status(201).json({
        userId: user.userId,
        email: user.email,
        accessToken,
        refreshToken: refreshTokenData.tokenId,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      // Get user
      const user = await userService.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const isValid = await userService.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user.userId, user.email, user.tokenVersion);
      const refreshTokenData = jwtService.generateRefreshToken();
      refreshTokenData.userId = user.userId;

      // Store refresh token
      await dynamoDBService.put(this.refreshTokensTable, refreshTokenData);

      res.json({
        userId: user.userId,
        email: user.email,
        accessToken,
        refreshToken: refreshTokenData.tokenId,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get refresh token from body or cookies
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      // Mark refresh token as revoked
      await dynamoDBService.update(
        this.refreshTokensTable,
        { tokenId: refreshToken },
        'SET revokedAt = :now',
        { ':now': new Date().toISOString() }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * POST /api/auth/refresh-token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      // Get refresh token from DB
      const storedToken = await dynamoDBService.get(this.refreshTokensTable, {
        tokenId: refreshToken,
      });

      if (!storedToken) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Check if revoked
      if (storedToken.revokedAt) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }

      // Check if expired
      const expiresAt = new Date(storedToken.expiresAt);
      if (expiresAt < new Date()) {
        res.status(401).json({ error: 'Refresh token expired' });
        return;
      }

      // Get user to get current tokenVersion
      const user = await userService.getUser(storedToken.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Generate new access token
      const accessToken = jwtService.generateAccessToken(
        user.userId,
        user.email,
        user.tokenVersion
      );

      res.json({ accessToken });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }
}

export default new AuthController();
