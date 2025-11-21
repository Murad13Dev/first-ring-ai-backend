import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
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
// ROUTES
// ==========================================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API root
app.get('/api', (req, res) => {
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

// TODO: Add remaining routes
// app.use('/api/analytics', analyticsRoutes);

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
