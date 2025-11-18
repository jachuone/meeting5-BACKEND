import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { JWTPayload } from '../types/index';

dotenv.config();

/**
 * JWT Utility Module
 * Handles JWT token generation and verification
 * @module JWTUtils
 */

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE: string = process.env.JWT_EXPIRE || '7d';

/**
 * Generates a JWT token for a user
 * @param payload - Data to encode in the token
 * @returns JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRE
    } as SignOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate token: ${message}`);
  }
};

/**
 * Verifies and decodes a JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw new Error(`Failed to verify token: ${error.message}`);
    }
    throw new Error('Failed to verify token');
  }
};

/**
 * Decodes a JWT token without verification
 * @param token - JWT token to decode
 * @returns Token payload or null if invalid
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};
