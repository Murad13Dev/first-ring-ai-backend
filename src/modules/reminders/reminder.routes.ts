import { Router, Response, NextFunction } from 'express';
import reminderService from './reminder.service';
import { authenticateToken, authenticateAdmin, AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @route POST /api/reminders/process
 * @desc Process all pending booking reminders (cron job endpoint)
 * @access Admin only (or internal cron)
 */
router.post('/process', authenticateAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await reminderService.processBookingReminders();
    res.json({
      success: true,
      message: 'Reminders processed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/reminders/send/:bookingId
 * @desc Send immediate reminder for a specific booking
 * @access Private
 */
router.post('/send/:bookingId', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const result = await reminderService.sendImmediateReminder(bookingId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/reminders/status/:bookingId
 * @desc Get reminder status for a booking
 * @access Private
 */
router.get('/status/:bookingId', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const status = await reminderService.getReminderStatus(bookingId);
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/reminders/confirmation/:bookingId
 * @desc Send booking confirmation email
 * @access Private
 */
router.post('/confirmation/:bookingId', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const result = await reminderService.sendBookingConfirmation(bookingId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
