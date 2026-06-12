import express from 'express';
import { handleAppointmentSuccess, handleReminderScheduled, handleAppointmentRescheduled, testEmailHandler, handleAppointmentCancelled, handleReminderCancelled, handleAppointmentNoShow, handleAppointmentCompleted } from '../controllers/notificationController.js';

const router = express.Router();

/**
 * Route to simulate a successful appointment booking
 * POST /api/notifications/appointment-success
 */
router.post('/appointment-success', handleAppointmentSuccess);

/**
 * Route to handle manual service reminder scheduling
 * POST /api/notifications/reminder-scheduled
 */
router.post('/reminder-scheduled', handleReminderScheduled);

/**
 * Route to handle appointment rescheduling
 * POST /api/notifications/appointment-rescheduled
 */
router.post('/appointment-rescheduled', handleAppointmentRescheduled);

/**
 * Route to handle appointment cancellation
 * POST /api/notifications/appointment-cancelled
 */
router.post('/appointment-cancelled', handleAppointmentCancelled);

/**
 * Route to handle appointment no-show
 * POST /api/notifications/appointment-no-show
 */
router.post('/appointment-no-show', handleAppointmentNoShow);

/**
 * Route to handle reminder cancellation
 * POST /api/notifications/reminder-cancelled
 */
router.post('/reminder-cancelled', handleReminderCancelled);

/**
 * Route to test the email service directly
 * POST /api/notifications/test-email
 */
router.post('/test-email', testEmailHandler);

/**
 * Route to handle appointment completion and vote of thanks
 * POST /api/notifications/appointment-completed
 */
router.post('/appointment-completed', handleAppointmentCompleted);

export default router;
