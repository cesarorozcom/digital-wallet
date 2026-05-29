import { Request, Response, NextFunction } from 'express';
import jwtService, { AccessTokenPayload } from '../services/JWTService';

/**
 * Extend Express Request to include user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Middleware to verify JWT access token
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);

    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return;
    }

    // Attach decoded token to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwtService.verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    // Silently continue without auth
    next();
  }
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

/**
 * 404 Not Found middleware
 */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ error: 'Route not found' });
};
