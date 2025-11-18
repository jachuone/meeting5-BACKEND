import { db } from '../config/firebase';
import { CreateUserDTO, UpdateUserDTO } from '../types/index';

/**
 * User Data Access Object
 * Handles all database operations for users
 * @module UserDAO
 */

/**
 * Reference to the users collection
 */
const usersCollection = db.collection('users');

/**
 * UserDAO class for database operations
 */
class UserDAO {
  /**
   * Creates a new user in the database
   * @param userData - User data to create
   * @returns Created user data with ID
   */
  static async create(userData: CreateUserDTO & { provider?: string }): Promise<any> {
    try {
      const docRef = await usersCollection.add({
        ...userData,
        provider: userData.provider || 'manual',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        id: docRef.id,
        ...userData
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create user: ${message}`);
    }
  }

  /**
   * Finds a user by ID
   * @param userId - User ID
   * @returns User data or null if not found
   */
  static async findById(userId: string): Promise<any | null> {
    try {
      const doc = await usersCollection.doc(userId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to find user by ID: ${message}`);
    }
  }

  /**
   * Finds a user by email
   * @param email - User's email
   * @returns User data or null if not found
   */
  static async findByEmail(email: string): Promise<any | null> {
    try {
      const snapshot = await usersCollection.where('email', '==', email).limit(1).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to find user by email: ${message}`);
    }
  }

  /**
   * Updates user information
   * @param userId - User ID
   * @param updateData - Data to update
   * @returns Updated user data
   */
  static async update(userId: string, updateData: Partial<UpdateUserDTO>): Promise<any> {
    try {
      await usersCollection.doc(userId).update({
        ...updateData,
        updatedAt: new Date()
      });
      
      return await this.findById(userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update user: ${message}`);
    }
  }

  /**
   * Deletes a user
   * @param userId - User ID
   * @returns Success status
   */
  static async delete(userId: string): Promise<boolean> {
    try {
      await usersCollection.doc(userId).delete();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete user: ${message}`);
    }
  }

  /**
   * Checks if an email already exists
   * @param email - Email to check
   * @returns True if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const user = await this.findByEmail(email);
      return user !== null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to check email existence: ${message}`);
    }
  }
}

export default UserDAO;
