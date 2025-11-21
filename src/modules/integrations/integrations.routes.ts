import { Router } from 'express';
import integrationsController from './integrations.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';

const router = Router();
router.use(authenticateToken, tenantIsolation);

// Google Sheets
router.get('/sheets/auth', integrationsController.getSheetsAuthUrl);
router.get('/sheets/callback', integrationsController.handleSheetsCallback);
router.post('/sheets/spreadsheet', integrationsController.createSpreadsheet);
router.get('/sheets/export/bookings', integrationsController.exportBookings);
router.get('/sheets/export/orders', integrationsController.exportOrders);
router.get('/sheets/export/calls', integrationsController.exportCalls);
router.delete('/sheets/disconnect', integrationsController.disconnectSheets);

// Google Calendar
router.get('/calendar/auth', integrationsController.getCalendarAuthUrl);
router.get('/calendar/list', integrationsController.listCalendars);
router.post('/calendar/event', integrationsController.createCalendarEvent);
router.get('/calendar/upcoming', integrationsController.getUpcomingEvents);
router.post('/calendar/sync', integrationsController.syncAllBookings);
router.delete('/calendar/disconnect', integrationsController.disconnectCalendar);

export default router;
