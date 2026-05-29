import { Router } from 'express';
import authController from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', (req, res) => authController.register(req, res));

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * POST /api/auth/logout
 * Logout (revoke refresh token)
 */
router.post('/logout', authenticateToken, (req, res) => authController.logout(req, res));

/**
 * POST /api/auth/refresh-token
 * Refresh access token
 */
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

export default router;
