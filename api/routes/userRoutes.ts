import express, { Router, Response } from 'express';
import { body } from 'express-validator';
import * as UserController from '../controllers/UserController';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AuthenticatedRequest } from '../types/index';

/**
 * User Routes
 * Defines all user-related routes
 * @module UserRoutes
 */

const router: Router = express.Router();

/**
 * POST /api/users/register
 * Registers a new user
 */
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('age').isInt({ min: 1, max: 120 }).withMessage('Age must be a valid number'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('provider').optional().isIn(['manual', 'google', 'facebook']).withMessage('Invalid provider')
  ],
  validate,
  UserController.register
);

/**
 * POST /api/users/login
 * Logs in a user
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password')
      .if(body('provider').equals('manual'))
      .notEmpty()
      .withMessage('Password is required'),
    body('provider').optional().isIn(['manual', 'google', 'facebook']).withMessage('Invalid provider')
  ],
  validate,
  UserController.login
);

/**
 * GET /api/users/profile
 * Gets the authenticated user's profile
 */
router.get('/profile', auth, UserController.getProfile);


/**
 * PUT /api/users/profile
 * Updates the user's profile
 */
router.put(
  '/profile',
  auth,
  [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Age must be a valid number'),
    body('email').optional().isEmail().withMessage('Invalid email')
  ],
  validate,
  UserController.updateProfile
);

// VERIFY TOKEN - Validate JWT Token
/**
 * GET /api/users/verify-token
 * Validates if a JWT token is valid
 * @returns {Object} 200 - Token is valid.
 * @returns {Error} 401 - Invalid or expired token.
 */
router.get('/verify-token', auth, (req: express.Request & { user?: { userId?: string; email?: string } }, res: express.Response) => {
  // `auth` middleware attaches an object to `req.user`:
  // { userId: decoded.userId, email: decoded.email }
  res.status(200).json({ valid: true, userId: req.user?.userId });
});

/**
 * DELETE /api/users/account
 * Deletes the user's account
 */
router.delete('/account', auth, UserController.deleteAccount);

// VERIFY TOKEN - Validate JWT token
/**
 * @route GET /users/verify-token
 * @returns {Object} 200 - Token is valid.
 * @returns {Error} 401 - Invalid or expired token.
 */
router.get('/verify-token', auth, (req: express.Request & { user?: { userId?: string; email?: string } }, res: express.Response) => {
  // `auth` middleware attaches an object to `req.user`:
  // { userId: decoded.userId, email: decoded.email }
  res.status(200).json({ valid: true, userId: req.user?.userId });
});

/**
 * PUT /api/users/password
 * Changes password for authenticated user
 */
router.put(
  '/password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  validate,
  UserController.changePassword
);

/**
 * POST /api/users/password-reset/request
 * Requests password recovery
 */
router.post(
  '/password-reset/request',
  [
    body('email').isEmail().withMessage('Invalid email')
  ],
  validate,
  UserController.requestPasswordReset
);

/**
 * POST /api/users/password-reset/confirm
 * Resets password with token
 */
router.post(
  '/password-reset/confirm',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  UserController.resetPassword
);

/**
 * POST /api/users/logout
 * Logs out the authenticated user
 */
router.post('/logout', auth, UserController.logout);

export default router;
