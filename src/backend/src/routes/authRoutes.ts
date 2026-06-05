import { Router, Request, Response } from 'express';
import authController from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  void authController.register(req, res);
});

router.post('/login', (req: Request, res: Response) => {
  void authController.login(req, res);
});

router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  void authController.logout(req, res);
});

router.post('/refresh-token', (req: Request, res: Response) => {
  void authController.refreshToken(req, res);
});

router.post('/refresh', (req: Request, res: Response) => {
  void authController.refreshToken(req, res);
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  void authController.me(req, res);
});

router.put('/profile', authenticateToken, (req: Request, res: Response) => {
  void authController.updateProfile(req, res);
});

export default router;
