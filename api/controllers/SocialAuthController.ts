import { Request, Response } from 'express';
import { auth } from '../config/firebase';
import UserDAO from '../dao/UserDAO';
import { generateToken } from '../utils/jwt';
import logger from '../utils/logger.js';
import { AuthenticatedRequest } from '../types/index';

/**
 * Social Authentication Controller
 * Handles Google and Facebook authentication via Firebase
 * @module SocialAuthController
 */

/**
 * Authenticates a user with Google or Facebook using Firebase ID token
 * @param req - Express request
 * @param res - Express response
 */
export const socialLogin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idToken, provider } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required'
      });
    }
    
    if (!['google', 'facebook'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Use "google" or "facebook"'
      });
    }
    
    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    
    // Check if user already exists
    let user = await UserDAO.findByEmail(email!);
    
    if (!user) {
      // Create new user for first-time social login
      const [firstName, ...lastNameParts] = (name || email!.split('@')[0]).split(' ');
      const lastName = lastNameParts.join(' ') || 'User';
      
      user = await UserDAO.create({
        firstName,
        lastName,
        age: 18, // Default age for social login
        email: email!,
        password: '', // No password for social login
        provider,
        firebaseUid: uid,
        profilePicture: picture || null
      } as any);
      
      logger.info(`New user created via ${provider}: ${email}`);
    } else {
      // Update existing user's Firebase UID if not set
      if (!user.firebaseUid) {
        await UserDAO.update(user.id, { firebaseUid: uid } as any);
      }
      
      logger.info(`User logged in via ${provider}: ${email}`);
    }
    
    // Remove password from response
    delete user.password;
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email
    });
    
    return res.status(200).json({
      success: true,
      message: 'Social login successful',
      data: {
        user,
        token
      }
    });
  } catch (error: any) {
    logger.error('Social login failed', error instanceof Error ? error : null);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'ID token has expired'
      });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid ID token'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate with social provider',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Links a social provider to an existing account
 * @param req - Express request
 * @param res - Express response
 */
export const linkSocialAccount = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { idToken, provider } = req.body;
    const userId = req.user!.userId;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required'
      });
    }
    
    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid } = decodedToken;
    
    // Update user with Firebase UID
    await UserDAO.update(userId, {
      firebaseUid: uid,
      provider: provider // Update provider if needed
    } as any);
    
    logger.info(`Social account linked: ${provider} for user ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: `${provider} account linked successfully`
    });
  } catch (error) {
    logger.error('Failed to link social account', error instanceof Error ? error : null);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to link social account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
