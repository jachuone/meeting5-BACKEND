import { db } from '../config/firebase';

/**
 * Password Reset Tokens Data Access Object
 * Handles password recovery token operations
 * @module PasswordResetDAO
 */

/**
 * Reference to the reset tokens collection
 */
const resetTokensCollection = db.collection('passwordResetTokens');

/**
 * Token data for creation
 */
interface CreateTokenDTO {
  userId: string;
  token: string;
  expiresAt: Date;
}

/**
 * PasswordResetDAO class for database operations
 */
class PasswordResetDAO {
  /**
   * Creates a new password reset token
   * @param tokenData - Token data
   * @returns Created token data with ID
   */
  static async create(tokenData: CreateTokenDTO): Promise<any> {
    try {
      const docRef = await resetTokensCollection.add({
        ...tokenData,
        used: false,
        createdAt: new Date()
      });
      
      return {
        id: docRef.id,
        ...tokenData,
        used: false
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create reset token: ${message}`);
    }
  }

  /**
   * Finds a valid token
   * @param token - Token to find
   * @returns Token data or null if not found/expired
   */
  static async findValidToken(token: string): Promise<any | null> {
    try {
      const snapshot = await resetTokensCollection
        .where('token', '==', token)
        .where('used', '==', false)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      // Check if token has expired
      if (data.expiresAt.toDate() < new Date()) {
        return null;
      }
      
      return {
        id: doc.id,
        ...data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to find token: ${message}`);
    }
  }

  /**
   * Marks a token as used
   * @param tokenId - Token ID
   * @returns Success status
   */
  static async markAsUsed(tokenId: string): Promise<boolean> {
    try {
      await resetTokensCollection.doc(tokenId).update({
        used: true,
        usedAt: new Date()
      });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to mark token as used: ${message}`);
    }
  }
}

export default PasswordResetDAO;
