import { Router, Request, Response } from 'express';
import authController from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  authController.register(req, res);
});

router.post('/login', (req: Request, res: Response) => {
  authController.login(req, res);
});

router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  authController.logout(req, res);
});

router.post('/refresh-token', (req: Request, res: Response) => {
  authController.refreshToken(req, res);
});

export default router;