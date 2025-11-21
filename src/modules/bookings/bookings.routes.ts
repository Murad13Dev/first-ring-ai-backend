import { Router } from 'express';
import bookingsController from './bookings.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';

const router = Router();

router.use(authenticateToken, tenantIsolation);

/**
 * @route   POST /api/bookings
 * @desc    Create booking
 * @access  Private
 */
router.post('/', bookingsController.createBooking);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings
 * @access  Private
 */
router.get('/', bookingsController.getBookings);

/**
 * @route   GET /api/bookings/availability
 * @desc    Check time slot availability
 * @access  Private
 */
router.get('/availability', bookingsController.checkAvailability);

/**
 * @route   GET /api/bookings/slots
 * @desc    Get available time slots for a date
 * @access  Private
 */
router.get('/slots', bookingsController.getAvailableSlots);

/**
 * @route   GET /api/bookings/stats
 * @desc    Get booking statistics
 * @access  Private
 */
router.get('/stats', bookingsController.getBookingStats);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', bookingsController.getBookingById);

/**
 * @route   PUT /api/bookings/:id
 * @desc    Update booking
 * @access  Private
 */
router.put('/:id', bookingsController.updateBooking);

/**
 * @route   POST /api/bookings/:id/confirm
 * @desc    Confirm booking
 * @access  Private
 */
router.post('/:id/confirm', bookingsController.confirmBooking);

/**
 * @route   POST /api/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private
 */
router.post('/:id/cancel', bookingsController.cancelBooking);

/**
 * @route   POST /api/bookings/:id/no-show
 * @desc    Mark booking as no-show
 * @access  Private
 */
router.post('/:id/no-show', bookingsController.markNoShow);

export default router;
