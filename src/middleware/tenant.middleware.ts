import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import logger from '../config/logger';

/**
 * Middleware to enforce tenant isolation
 * Ensures that users can only access data belonging to their tenant
 */
export const tenantIsolation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user has a tenantId
    if (!req.user.tenantId) {
      logger.warn('User without tenantId attempted access', {
        userId: req.user.id,
        email: req.user.email,
      });
      return res.status(403).json({
        success: false,
        message: 'Tenant association required',
      });
    }

    // Inject tenantId into request for easy access
    req.tenantId = req.user.tenantId;

    next();
  } catch (error) {
    logger.error('Tenant isolation error', { error });
    return res.status(500).json({
      success: false,
      message: 'Tenant isolation error',
    });
  }
};

/**
 * Middleware to validate tenant ownership of a resource
 * Use this when accessing resources that belong to a specific tenant
 */
export const validateTenantOwnership = (tenantIdField: string = 'tenantId') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resourceTenantId = req.params[tenantIdField] || req.body[tenantIdField];

      if (!resourceTenantId) {
        return res.status(400).json({
          success: false,
          message: `${tenantIdField} is required`,
        });
      }

      if (resourceTenantId !== req.user?.tenantId) {
        logger.warn('Tenant ownership violation attempt', {
          userId: req.user?.id,
          userTenantId: req.user?.tenantId,
          resourceTenantId,
        });
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      next();
    } catch (error) {
      logger.error('Tenant ownership validation error', { error });
      return res.status(500).json({
        success: false,
        message: 'Validation error',
      });
    }
  };
};
