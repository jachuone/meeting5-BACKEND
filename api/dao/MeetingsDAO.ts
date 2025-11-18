import { db } from '../config/firebase';
import { UpdateMeetingDTO } from '../types/index';

/**
 * Meetings Data Access Object
 * Handles all database operations for video conference meetings
 * @module MeetingsDAO
 */

/**
 * Reference to the meetings collection
 */
const meetingsCollection = db.collection('meetings');

/**
 * MeetingsDAO class for database operations
 */
class MeetingsDAO {
  /**
   * Creates a new meeting
   * @param meetingData - Meeting data to create
   * @returns Created meeting data with ID
   */
  static async create(meetingData: any): Promise<any> {
    try {
      const docRef = await meetingsCollection.add({
        ...meetingData,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        id: docRef.id,
        ...meetingData,
        status: 'scheduled'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create meeting: ${message}`);
    }
  }

  /**
   * Finds a meeting by ID
   * @param meetingId - Meeting ID
   * @returns Meeting data or null if not found
   */
  static async findById(meetingId: string): Promise<any | null> {
    try {
      const doc = await meetingsCollection.doc(meetingId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to find meeting by ID: ${message}`);
    }
  }

  /**
   * Gets all meetings for a user (as host or participant)
   * @param userId - User ID
   * @returns Array of meeting data
   */
  static async getByUserId(userId: string): Promise<any[]> {
    try {
      // Get meetings where user is host
      const hostSnapshot = await meetingsCollection
        .where('hostId', '==', userId)
        .get();
      
      // Get meetings where user is participant
      const participantSnapshot = await meetingsCollection
        .where('participants', 'array-contains', userId)
        .get();
      
      const hostMeetings = hostSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'host'
      }));
      
      const participantMeetings = participantSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'participant'
      }));
      
      // Combine and remove duplicates
      const allMeetings = [...hostMeetings, ...participantMeetings];
      const uniqueMeetings = Array.from(
        new Map(allMeetings.map(meeting => [meeting.id, meeting])).values()
      );
      
      // Sort by date in memory (avoids need for composite indexes)
      uniqueMeetings.sort((a: any, b: any) => {
        const dateA = a.scheduledAt?.toDate?.() || new Date(a.scheduledAt);
        const dateB = b.scheduledAt?.toDate?.() || new Date(b.scheduledAt);
        return dateB.getTime() - dateA.getTime(); // Descending (most recent first)
      });
      
      return uniqueMeetings;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get user meetings: ${message}`);
    }
  }

  /**
   * Updates a meeting
   * @param meetingId - Meeting ID
   * @param updateData - Data to update
   * @returns Updated meeting data
   */
  static async update(meetingId: string, updateData: Partial<UpdateMeetingDTO>): Promise<any> {
    try {
      await meetingsCollection.doc(meetingId).update({
        ...updateData,
        updatedAt: new Date()
      });
      
      return await this.findById(meetingId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update meeting: ${message}`);
    }
  }

  /**
   * Deletes a meeting
   * @param meetingId - Meeting ID
   * @returns Success status
   */
  static async delete(meetingId: string): Promise<boolean> {
    try {
      await meetingsCollection.doc(meetingId).delete();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete meeting: ${message}`);
    }
  }
}

export default MeetingsDAO;
