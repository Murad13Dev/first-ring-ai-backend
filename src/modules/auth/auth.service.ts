import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import { emailService } from '../../services/email.service';

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

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          tenantId: data.tenantId,
          role: data.role || 'owner',
          verificationToken,
          verificationTokenExpires,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      // Send verification email
      try {
        await emailService.sendVerificationEmail(user.email, user.name, verificationToken);
        logger.info('Verification email sent', { userId: user.id, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send verification email', { error: emailError, userId: user.id });
        // Don't throw error, user can resend verification email
      }

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        user,
        message: 'Registration successful. Please check your email to verify your account. Your account will require admin approval before you can log in.',
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

      // Check if email is verified
      if (!user.emailVerified) {
        throw new AppError('Email not verified. Please check your email and verify your account.', 403);
      }

      // Check if admin approved
      if (!user.adminApproved) {
        throw new AppError('Your account is pending admin approval. You will receive an email once approved.', 403);
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
   * Verify email with token
   */
  async verifyEmail(token: string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new AppError('Invalid or expired verification token', 400);
      }

      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpires: null,
        },
      });

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        logger.error('Failed to send welcome email', { error: emailError, userId: user.id });
      }

      logger.info('Email verified successfully', { userId: user.id, email: user.email });

      return {
        message: 'Email verified successfully! Your account is pending admin approval. You will receive an email once approved.',
      };
    } catch (error) {
      logger.error('Email verification error', { error });
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.emailVerified) {
        throw new AppError('Email already verified', 400);
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken,
          verificationTokenExpires,
        },
      });

      // Send verification email
      await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

      logger.info('Verification email resent', { userId: user.id, email: user.email });

      return {
        message: 'Verification email has been resent. Please check your email.',
      };
    } catch (error) {
      logger.error('Resend verification email error', { error });
      throw error;
    }
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

  /**
   * Set password from verification token (for new tenants)
   */
  async setPasswordFromToken(token: string, newPassword: string) {
    try {
      // Find user with this verification token
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpires: {
            gt: new Date(), // Token not expired
          },
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              businessType: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError('Invalid or expired verification token', 400);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update user: set password, verify email, clear token, auto-approve
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          emailVerified: true,
          adminApproved: true, // Auto-approve tenant owners
          approvedAt: new Date(),
          verificationToken: null,
          verificationTokenExpires: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          adminApproved: true,
          tenantId: true,
          tenant: {
            select: {
              id: true,
              name: true,
              businessType: true,
              plan: true,
            },
          },
        },
      });

      logger.info('Password set successfully from verification token', {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
      });

      return {
        user: updatedUser,
        message: 'Password set successfully. Your account has been activated!',
      };
    } catch (error) {
      logger.error('Set password from token error', { error });
      throw error;
    }
  }

  /**
   * Verify OTP and set password
   * Used after admin converts lead to tenant
   */
  async verifyOTPAndSetPassword(data: { token: string; otp: string; password: string }) {
    try {
      // Validate password length
      if (data.password.length < 8) {
        throw new AppError('Password must be at least 8 characters long', 400);
      }

      // Find user with verification token
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: data.token,
        },
      });

      if (!user) {
        throw new AppError('Invalid or expired setup link', 400);
      }

      // Check if OTP exists
      if (!user.temporaryPassword) {
        throw new AppError('No verification code found for this account', 400);
      }

      // Check if OTP expired
      if (!user.temporaryPasswordExpires || user.temporaryPasswordExpires < new Date()) {
        throw new AppError('Verification code has expired', 400);
      }

      // Check if OTP already used
      if (user.temporaryPasswordUsed) {
        throw new AppError('This verification code has already been used', 400);
      }

      // Verify OTP
      const isOTPValid = await bcrypt.compare(data.otp, user.temporaryPassword);

      if (!isOTPValid) {
        throw new AppError('Invalid verification code', 400);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Update user with new password and mark OTP as used
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          temporaryPassword: null,
          temporaryPasswordExpires: null,
          temporaryPasswordUsed: true,
          verificationToken: null, // Clear setup token
        },
      });

      logger.info('Password set successfully via OTP', { userId: user.id, email: user.email });

      return {
        message: 'Password set successfully! You can now log in with your new password.',
      };
    } catch (error) {
      logger.error('Verify OTP and set password error', { error });
      throw error;
    }
  }

  /**
   * Step 1: Verify OTP only (separate from password setting)
   * POST /api/auth/verify-otp
   */
  async verifyOTP(data: { token: string; otp: string }) {
    try {
      // Find user with verification token
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: data.token,
        },
      });

      if (!user) {
        throw new AppError('Invalid or expired setup link', 400);
      }

      // Check if OTP exists
      if (!user.temporaryPassword) {
        throw new AppError('No verification code found for this account', 400);
      }

      // Check if OTP expired
      if (!user.temporaryPasswordExpires || user.temporaryPasswordExpires < new Date()) {
        throw new AppError('Verification code has expired', 400);
      }

      // Check if OTP already used
      if (user.temporaryPasswordUsed) {
        throw new AppError('This verification code has already been used', 400);
      }

      // Verify OTP
      const isOTPValid = await bcrypt.compare(data.otp, user.temporaryPassword);

      if (!isOTPValid) {
        throw new AppError('Invalid verification code', 400);
      }

      // Generate a temporary session token for password setup (valid for 15 minutes)
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const sessionToken = jwt.sign(
        {
          userId: user.id,
          purpose: 'password-setup',
          otpVerified: true,
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      logger.info('OTP verified successfully', { userId: user.id, email: user.email });

      return {
        message: 'Verification code confirmed successfully',
        sessionToken,
      };
    } catch (error) {
      logger.error('Verify OTP error', { error });
      throw error;
    }
  }

  /**
   * Step 2: Set password after OTP verification
   * POST /api/auth/set-password-after-otp
   */
  async setPasswordAfterOTP(data: { sessionToken: string; password: string }) {
    try {
      // Validate password length
      if (data.password.length < 8) {
        throw new AppError('Password must be at least 8 characters long', 400);
      }

      // Verify session token
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      let decoded: any;

      try {
        decoded = jwt.verify(data.sessionToken, JWT_SECRET);
      } catch (err) {
        throw new AppError('Invalid or expired session token', 400);
      }

      // Check token purpose
      if (decoded.purpose !== 'password-setup' || !decoded.otpVerified) {
        throw new AppError('Invalid session token', 400);
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if OTP already used (double-check for security)
      if (user.temporaryPasswordUsed) {
        throw new AppError('This verification code has already been used', 400);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Update user with new password and mark OTP as used
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          temporaryPassword: null,
          temporaryPasswordExpires: null,
          temporaryPasswordUsed: true,
          verificationToken: null, // Clear setup token
        },
      });

      // Send password change confirmation email
      try {
        await emailService.sendPasswordChangeConfirmationEmail(user.email, user.name);
        logger.info('Password change confirmation email sent', {
          userId: user.id,
          email: user.email
        });
      } catch (emailError) {
        // Log error but don't fail the request since password was already changed
        logger.error('Failed to send password change confirmation email', {
          userId: user.id,
          email: user.email,
          error: emailError
        });
      }

      logger.info('Password set successfully after OTP verification', {
        userId: user.id,
        email: user.email
      });

      return {
        message: 'Password set successfully! You can now log in with your new password.',
      };
    } catch (error) {
      logger.error('Set password after OTP error', { error });
      throw error;
    }
  }
}

export default new AuthService();
