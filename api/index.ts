import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';
import meetingsRoutes from './routes/meetingsRoutes';
import socialAuthRoutes from './routes/socialAuthRoutes';
import logger from './utils/logger';

dotenv.config();

/**
 * Main Application Entry Point
 * Configures and runs the Express server
 * @module Index
 */

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000');

/**
 * Global middlewares
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Logging middleware
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server running correctly',
    timestamp: new Date().toISOString()
  });
});

/**
 * Main routes
 */
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/auth/social', socialAuthRoutes);

/**
 * 404 route
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/**
 * Global error handler
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', err instanceof Error ? err : null);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Mode: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
