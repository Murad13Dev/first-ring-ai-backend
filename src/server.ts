import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import logger from './config/logger';
import { errorHandler, notFound } from './middleware/error.middleware';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import leadsRoutes from './modules/leads/leads.routes';
import tenantsRoutes from './modules/tenants/tenants.routes';
import servicesRoutes from './modules/services/services.routes';
import faqsRoutes from './modules/faqs/faqs.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import ordersRoutes from './modules/orders/orders.routes';
import callsRoutes from './modules/calls/calls.routes';
import aiAgentRoutes from './modules/ai-agent/ai-agent.routes';
import integrationsRoutes from './modules/integrations/integrations.routes';
import posIntegrationsRoutes from './modules/pos-integrations/pos-integrations.routes';
import channelsRoutes from './modules/channels/channels.routes';
import followUpsRoutes from './modules/follow-ups/follow-ups.routes';
import retellRoutes from './modules/retell/retell.routes';
import businessTypesRoutes from './modules/business-types/business-types.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import adminDashboardRoutes from './modules/admin-dashboard/admin-dashboard.routes';
import customerDashboardRoutes from './modules/customer-dashboard/customer-dashboard.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import certifiedRepsRoutes from './modules/certified-reps/certified-reps.routes';
import blogRoutes from './modules/blog/blog.routes';
import partnerLogosRoutes from './modules/partner-logos/partner-logos.routes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();

// ==========================================
// MIDDLEWARE
// ==========================================

// Security headers
app.use(helmet());

// CORS
// CORS CONFIG FOR PRODUCTION + LOCAL DEV
const allowedOrigins = [
  'https://firstring.ai',
  'https://www.firstring.ai',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==========================================
// SWAGGER API DOCS
// ==========================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
// ROUTES
// ==========================================

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API root
app.get('/api', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'First Ring AI API v1.0',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      leads: '/api/leads',
      tenants: '/api/tenants',
      services: '/api/services',
      faqs: '/api/faqs',
    },
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/ai-agent', aiAgentRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/pos', posIntegrationsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/follow-ups', followUpsRoutes);
app.use('/api/retell', retellRoutes);
app.use('/api/business-types', businessTypesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/dashboard', customerDashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/certified-reps', certifiedRepsRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/blog', partnerLogosRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ==========================================
// SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  logger.info(`📡 API URL: http://localhost:${PORT}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API endpoints: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', { error: err });
  server.close(() => process.exit(1));
});

export default app;
