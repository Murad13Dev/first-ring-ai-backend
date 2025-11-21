import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  tenantId: string;
  role?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError('Email already registered', 400);
      }

      // Check if tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: data.tenantId },
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          tenantId: data.tenantId,
          role: data.role || 'owner',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Registration error', { error });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              plan: true,
              subscriptionStatus: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError('Account is inactive', 403);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      const { passwordHash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login error', { error });
      throw error;
    }
  }

  /**
   * Admin login
   */
  async adminLogin(data: LoginData) {
    try {
      const admin = await prisma.adminUser.findUnique({
        where: { email: data.email },
      });

      if (!admin) {
        throw new AppError('Invalid credentials', 401);
      }

      if (!admin.isActive) {
        throw new AppError('Account is inactive', 403);
      }

      const isPasswordValid = await bcrypt.compare(data.password, admin.passwordHash);

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      const accessToken = this.generateAdminAccessToken(admin);

      logger.info('Admin logged in successfully', {
        adminId: admin.id,
        email: admin.email,
      });

      const { passwordHash, ...adminWithoutPassword } = admin;

      return {
        admin: adminWithoutPassword,
        accessToken,
      };
    } catch (error) {
      logger.error('Admin login error', { error });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
      }

      const accessToken = this.generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      logger.error('Token refresh error', { error });
      throw new AppError('Invalid refresh token', 401);
    }
  }

  /**
   * Generate access token (JWT)
   */
  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      } as jwt.SignOptions
    );
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      } as jwt.SignOptions
    );
  }

  /**
   * Generate admin access token
   */
  private generateAdminAccessToken(admin: any): string {
    return jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: 'admin',
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '24h',
      } as jwt.SignOptions
    );
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          avatar: true,
          tenantId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              businessType: true,
              plan: true,
              subscriptionStatus: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return user;
    } catch (error) {
      logger.error('Get profile error', { error });
      throw error;
    }
  }
}

export default new AuthService();
