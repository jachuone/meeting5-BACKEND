import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import MeetingsDAO from '../dao/MeetingsDAO';
import UserDAO from '../dao/UserDAO';
import { sendMeetingInvitation } from '../utils/emailService';
import logger from '../utils/logger.js';
import { AuthenticatedRequest } from '../types/index';

/**
 * Meetings Controller
 * Handles all meeting-related requests
 * @module MeetingsController
 */

/**
 * Creates a new meeting
 * @param req - Express request
 * @param res - Express response
 */
export const createMeeting = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { title, description, scheduledAt, participants = [] } = req.body;
    
    // Validate that scheduledAt is a valid date
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date is not valid'
      });
    }
    
    // Generate unique URL for the meeting
    const meetingId = uuidv4();
    const meetingUrl = `${process.env.FRONTEND_URL}/meeting/${meetingId}`;
    
    // Create the meeting
    const meetingData = {
      title,
      description: description || '',
      scheduledAt: scheduledDate,
      hostId: req.user!.userId,
      participants: Array.isArray(participants) ? participants : [],
      meetingUrl
    };
    
    const meeting = await MeetingsDAO.create(meetingData);
    
    // Send invitations to participants
    if (Array.isArray(participants) && participants.length > 0) {
      for (const participantId of participants) {
        try {
          const participant = await UserDAO.findById(participantId);
          if (participant && participant.email) {
            await sendMeetingInvitation(participant.email, {
              title,
              description: description || '',
              scheduledAt: scheduledDate,
              meetingUrl
            });
          }
        } catch (emailError) {
          logger.error(`Failed to send invitation to participant ${participantId}`, emailError instanceof Error ? emailError : null);
          // Continue with other participants
        }
      }
    }
    
    logger.info(`Meeting created: ${title} by user ${req.user!.userId}`);
    
    return res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting
    });
  } catch (error) {
    logger.error('Failed to create meeting', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to create meeting',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Gets all meetings for the user
 * @param req - Express request
 * @param res - Express response
 */
export const getUserMeetings = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const meetings = await MeetingsDAO.getByUserId(req.user!.userId);
    
    return res.status(200).json({
      success: true,
      data: meetings
    });
  } catch (error) {
    logger.error('Failed to get meetings', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to get meetings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Gets a meeting by ID
 * @param req - Express request
 * @param res - Express response
 */
export const getMeetingById = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    
    const meeting = await MeetingsDAO.findById(id);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }
    
    // Verify that user has access to the meeting
    const hasAccess = meeting.hostId === req.user!.userId || 
                     meeting.participants.includes(req.user!.userId);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this meeting'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: meeting
    });
  } catch (error) {
    logger.error('Failed to get meeting', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to get meeting',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Updates a meeting
 * @param req - Express request
 * @param res - Express response
 */
export const updateMeeting = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { title, description, scheduledAt, status } = req.body;
    
    const meeting = await MeetingsDAO.findById(id);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }
    
    // Only the host can update the meeting
    if (meeting.hostId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can update the meeting'
      });
    }
    
    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (status) updateData.status = status;
    
    const updatedMeeting = await MeetingsDAO.update(id, updateData);
    
    logger.info(`Meeting updated: ${id}`);
    
    return res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: updatedMeeting
    });
  } catch (error) {
    logger.error('Failed to update meeting', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to update meeting',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Deletes a meeting
 * @param req - Express request
 * @param res - Express response
 */
export const deleteMeeting = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    
    const meeting = await MeetingsDAO.findById(id);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }
    
    // Only the host can delete the meeting
    if (meeting.hostId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can delete the meeting'
      });
    }
    
    await MeetingsDAO.delete(id);
    
    logger.info(`Meeting deleted: ${id}`);
    
    return res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete meeting', error instanceof Error ? error : null);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete meeting',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
