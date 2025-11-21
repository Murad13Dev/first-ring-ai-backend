import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../config/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
  tenantId?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
      if (err) {
        logger.warn('Invalid token attempt', { error: err.message });
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }

      req.user = decoded;
      req.tenantId = decoded.tenantId;
      next();
    });
  } catch (error) {
    logger.error('Authentication error', { error });
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

export const authenticateAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
      if (err || decoded.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    logger.error('Admin authentication error', { error });
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
      if (!err) {
        req.user = decoded;
        req.tenantId = decoded.tenantId;
      }
      next();
    });
  } catch (error) {
    next();
  }
};
