import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types/index';

/**
 * Authentication Middleware
 * Verifies that the user is authenticated via JWT
 * @module AuthMiddleware
 */

/**
 * Middleware to verify authentication
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // Verify the token
    const decoded = verifyToken(token);
    
    // Add user information to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    logger.error('Authentication failed', error instanceof Error ? error : null);
    
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid or expired token'
    });
  }
};
