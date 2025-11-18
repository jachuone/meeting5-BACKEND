import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import UserDAO from '../dao/UserDAO';
import PasswordResetDAO from '../dao/PasswordResetDAO';
import { generateToken } from '../utils/jwt';
import { sendPasswordRecoveryEmail } from '../utils/emailService';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types/index';

/**
 * User Controller
 * Handles all user-related requests
 * @module UserController
 */

/**
 * Registers a new user
 * @param req - Express request
 * @param res - Express response
 */
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { firstName, lastName, age, email, password, provider = 'manual' } = req.body;
    
    // Check if email already exists
    const existingUser = await UserDAO.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    
    // Hash the password (only for manual registration)
    let hashedPassword: string | null = null;
    if (provider === 'manual' && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    // Create the user
    const userData = {
      firstName,
      lastName,
      age: parseInt(age),
      email,
      password: hashedPassword!,
      provider
    };
    
    const user = await UserDAO.create(userData);
    
    // Do not return the password
    delete user.password;
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email
    });
    
    logger.info(`User registered: ${email}`);
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    logger.error('Failed to register user', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Logs in a user
 * @param req - Express request
 * @param res - Express response
 */
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password, provider = 'manual' } = req.body;
    
    // Find the user
    const user = await UserDAO.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Verify password (only for manual login)
    if (provider === 'manual') {
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    }
    
    // Do not return the password
    delete user.password;
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email
    });
    
    logger.info(`User logged in: ${email}`);
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    logger.error('Failed to log in user', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to log in',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Gets the profile of the authenticated user
 * @param req - Express request
 * @param res - Express response
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const user = await UserDAO.findById(req.user!.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Do not return the password
    delete user.password;
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Failed to get profile', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Updates user information
 * @param req - Express request
 * @param res - Express response
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { firstName, lastName, age, email } = req.body;
    
    // Check if the new email already exists (if it's being changed)
    if (email && email !== req.user!.email) {
      const existingUser = await UserDAO.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
    }
    
    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (age) updateData.age = parseInt(age);
    if (email) updateData.email = email;
    
    const updatedUser = await UserDAO.update(req.user!.userId, updateData);
    
    // Do not return the password
    delete updatedUser.password;
    
    logger.info(`User updated: ${req.user!.email}`);
    
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Failed to update profile', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Deletes the user account
 * @param req - Express request
 * @param res - Express response
 */
export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    await UserDAO.delete(req.user!.userId);
    
    logger.info(`User deleted: ${req.user!.email}`);
    
    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete account', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Requests password recovery
 * @param req - Express request
 * @param res - Express response
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email } = req.body;
    
    // Find the user
    const user = await UserDAO.findByEmail(email);
    
    if (!user) {
      // For security, return success even if user doesn't exist
      return res.status(200).json({
        success: true,
        message: 'If the email exists, you will receive instructions to reset your password'
      });
    }
    
    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expires in 1 hour
    
    // Save the token
    await PasswordResetDAO.create({
      userId: user.id,
      token: resetToken,
      expiresAt
    });
    
    // Send email
    try {
      await sendPasswordRecoveryEmail(email, resetToken);
      logger.info(`Password recovery email sent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send recovery email to ${email}:`, emailError instanceof Error ? emailError : null);
      // In development: continue anyway (token is in database)
      // In production: you might want to return an error
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Failed to send recovery email. Please try again later.');
      }
    }
    
    logger.info(`Password recovery token created for: ${email}`);
    
    return res.status(200).json({
      success: true,
      message: 'If the email exists, you will receive instructions to reset your password'
    });
  } catch (error) {
    logger.error('Failed to request password recovery', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Resets password with token
 * @param req - Express request
 * @param res - Express response
 */
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token, newPassword } = req.body;
    
    // Verify the token
    const resetToken = await PasswordResetDAO.findValidToken(token);
    
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await UserDAO.update(resetToken.userId, {
      password: hashedPassword
    });
    
    // Mark token as used
    await PasswordResetDAO.markAsUsed(resetToken.id);
    
    logger.info(`Password reset for user ID: ${resetToken.userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error('Failed to reset password', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Changes password for authenticated user
 * @param req - Express request
 * @param res - Express response
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get the user with password
    const user = await UserDAO.findById(req.user!.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await UserDAO.update(req.user!.userId, {
      password: hashedPassword
    });
    
    logger.info(`Password changed for user: ${req.user!.email}`);
    
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Failed to change password', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Logs out a user (invalidates token on client side)
 * @param req - Express request
 * @param res - Express response
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    // Note: With JWT, logout is handled client-side by removing the token
    // This endpoint serves as a confirmation and logging mechanism
    
    logger.info(`User logged out: ${req.user!.email}`);
    
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Failed to logout', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
