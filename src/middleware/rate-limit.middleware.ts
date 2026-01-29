import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and ensures fair usage
 */

// Custom key generator that uses IP or tenant ID
const keyGenerator = (req: Request): string => {
  // If authenticated, use tenant ID for rate limiting
  const tenantId = (req as any).user?.tenantId;
  if (tenantId) {
    return `tenant:${tenantId}`;
  }

  // Otherwise use IP address
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    tenantId: (req as any).user?.tenantId,
  });

  res.status(429).json({
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * General API rate limiter
 * 100 requests per minute per tenant/IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 10 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  keyGenerator: (req: Request) => {
    // Always use IP for auth endpoints
    return `auth:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts',
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for password reset
 * 5 attempts per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per window
  keyGenerator: (req: Request) => {
    return `pwreset:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Password reset rate limit exceeded', { ip: req.ip });

    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts',
      message: 'Too many password reset requests. Please try again in 1 hour.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Webhook rate limiter (more lenient for external services)
 * 1000 requests per minute
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per window
  keyGenerator: (req: Request) => {
    return `webhook:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create a custom rate limiter with specific settings
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: (req: Request) => {
      const key = keyGenerator(req);
      return options.keyPrefix ? `${options.keyPrefix}:${key}` : key;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        prefix: options.keyPrefix,
      });

      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Tenant-specific rate limiter based on plan
 * Higher limits for paid plans
 */
export const tenantPlanLimiter = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user?.tenantId) {
    // Use default limiter for unauthenticated requests
    return apiLimiter(req, res, next);
  }

  // Get subscription tier from injected subscription status
  const subscriptionTier = (req as any).subscriptionTier || 'free';

  // Define limits per plan
  const planLimits: Record<string, number> = {
    free: 50,       // 50 requests per minute
    starter: 100,   // 100 requests per minute
    basic: 200,     // 200 requests per minute
    pro: 500,       // 500 requests per minute
    professional: 500,
    enterprise: 2000, // 2000 requests per minute
  };

  const limit = planLimits[subscriptionTier] || planLimits.free;

  // Create dynamic limiter
  const dynamicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: limit,
    keyGenerator: () => `tenant:${user.tenantId}`,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
  });

  return dynamicLimiter(req, res, next);
};
