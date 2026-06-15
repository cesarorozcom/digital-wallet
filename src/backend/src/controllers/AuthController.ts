/** 
 *  bank-summary is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    bank-summary is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with bank-summary.  If not, see <https://gnu.org>.
*/
import { Request, Response } from 'express';
import UserService from '../services/UserService';
import JWTService from '../services/JWTService';
import DynamoDBService from '../services/DynamoDBService';
import { RefreshToken } from '../models/RefreshToken';
import { PublicUser, toPublicUser } from '../models/User';

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

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshTokenId: string;
  user: PublicUser;
}

class AuthController {
  private getAuthenticatedUserId(req: Request): string | null {
    return req.user?.sub || null;
  }

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
      refreshToken.userId = user.userId;

      await DynamoDBService.put(
        process.env.REFRESH_TOKENS_TABLE || 'refreshTokens',
        refreshToken
      );

      const response: AuthResponse = {
        accessToken,
        refreshTokenId: refreshToken.tokenId,
        user: toPublicUser(user),
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
      refreshToken.userId = user.userId;

      await DynamoDBService.put(
        process.env.REFRESH_TOKENS_TABLE || 'refreshTokens',
        refreshToken
      );

      const response: AuthResponse = {
        accessToken,
        refreshTokenId: refreshToken.tokenId,
        user: toPublicUser(user),
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

      const token = tokenRecord as RefreshToken;

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
        user: toPublicUser(userData),
      };

      res.json(response);
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: error.message || 'Token refresh failed' });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.getAuthenticatedUserId(req);

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await UserService.getUserById(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user: toPublicUser(user) });
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch current user' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.getAuthenticatedUserId(req);

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { firstName, lastName, email } = req.body as UpdateProfileRequest;

      if (!firstName && !lastName && !email) {
        res.status(400).json({ error: 'At least one profile field is required' });
        return;
      }

      const currentUser = await UserService.getUserById(userId);

      if (!currentUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updates: Partial<typeof currentUser> = {};

      if (email) {
        const normalizedEmail = email.toLowerCase();
        const existingUser = await UserService.getUserByEmail(normalizedEmail);

        if (existingUser && existingUser.userId !== userId) {
          res.status(409).json({ error: 'User with this email already exists' });
          return;
        }

        updates.email = normalizedEmail;
      }

      if (firstName) {
        updates.firstName = firstName;
      }

      if (lastName) {
        updates.lastName = lastName;
      }

      const updatedUser = await UserService.updateUser(userId, updates);

      if (!updatedUser) {
        res.status(500).json({ error: 'Failed to update profile' });
        return;
      }

      res.json({ user: toPublicUser(updatedUser) });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(400).json({ error: error.message || 'Profile update failed' });
    }
  }
}

export default new AuthController();
