import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth';
import { authenticateToken, errorHandler, notFound } from './middleware/auth';

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Protected example endpoint
app.get('/api/protected-example', authenticateToken, (req: Request, res: Response) => {
  res.json({
    message: 'This is a protected endpoint',
    user: req.user,
  });
});

// Error handlers (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`📝 Auth endpoints: http://localhost:${port}/api/auth/{register,login,logout,refresh-token}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
