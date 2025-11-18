import express, { Router } from 'express';
import { body } from 'express-validator';
import { socialLogin, linkSocialAccount } from '../controllers/SocialAuthController';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';

/**
 * Social Authentication Routes
 * Defines routes for Google and Facebook authentication
 * @module SocialAuthRoutes
 */

const router: Router = express.Router();

/**
 * POST /api/auth/social/login
 * Authenticates or creates a user using Google/Facebook
 */
router.post(
  '/login',
  [
    body('idToken').notEmpty().withMessage('ID token is required'),
    body('provider').isIn(['google', 'facebook']).withMessage('Provider must be google or facebook')
  ],
  validate,
  socialLogin
);

/**
 * POST /api/auth/social/link
 * Links a social provider to existing authenticated account
 */
router.post(
  '/link',
  auth,
  [
    body('idToken').notEmpty().withMessage('ID token is required'),
    body('provider').isIn(['google', 'facebook']).withMessage('Provider must be google or facebook')
  ],
  validate,
  linkSocialAccount
);

export default router;
