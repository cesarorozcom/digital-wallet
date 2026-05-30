import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth';

const app: Express = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting server configuration...');
console.log('Environment:', {
  PORT: port,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  NODE_ENV: process.env.NODE_ENV,
});

// ⭐ CORS MUST be first middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

console.log('CORS Config:', corsOptions);
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Billetera Digital API', version: '1.0.0' });
});

// API Routes
app.use('/api/auth', authRoutes);

// Routes list
app.get('/api/routes', (req: Request, res: Response) => {
  res.json({
    available_routes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'POST /api/auth/refresh-token',
    ],
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🔴 Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const server = app.listen(port, () => {
  console.log(`✅ Backend running on http://localhost:${port}`);
  console.log(`📝 Health: http://localhost:${port}/health`);
  console.log(`🔐 Auth Base: http://localhost:${port}/api/auth`);
  console.log(`✨ Frontend should be on http://localhost:3001`);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});

export default app;