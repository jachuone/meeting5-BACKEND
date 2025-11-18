import express, { Router } from 'express';
import { body } from 'express-validator';
import * as MeetingsController from '../controllers/MeetingsController';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';

/**
 * Meetings Routes
 * Defines all meeting-related routes
 * @module MeetingsRoutes
 */

const router: Router = express.Router();

/**
 * POST /api/meetings
 * Creates a new meeting
 */
router.post(
  '/',
  auth,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('scheduledAt').isISO8601().withMessage('Date must be valid'),
    body('participants').optional().isArray().withMessage('Participants must be an array')
  ],
  validate,
  MeetingsController.createMeeting
);

/**
 * GET /api/meetings
 * Gets all meetings for the user
 */
router.get('/', auth, MeetingsController.getUserMeetings);

/**
 * GET /api/meetings/:id
 * Gets a meeting by ID
 */
router.get('/:id', auth, MeetingsController.getMeetingById);

/**
 * PUT /api/meetings/:id
 * Updates a meeting
 */
router.put(
  '/:id',
  auth,
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isString(),
    body('scheduledAt').optional().isISO8601().withMessage('Date must be valid'),
    body('status').optional().isIn(['scheduled', 'ongoing', 'completed', 'cancelled']).withMessage('Invalid status')
  ],
  validate,
  MeetingsController.updateMeeting
);

/**
 * DELETE /api/meetings/:id
 * Deletes a meeting
 */
router.delete('/:id', auth, MeetingsController.deleteMeeting);

export default router;
