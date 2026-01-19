import { Request, Response, NextFunction } from 'express';
import authService from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, tenantId, role } = req.body;

      // Validation
      if (!email || !password || !name || !tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, name, and tenantId are required',
        });
      }

      const result = await authService.register({
        email,
        password,
        name,
        tenantId,
        role,
      });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const result = await authService.login({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin login
   * POST /api/auth/admin/login
   */
  async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const result = await authService.adminLogin({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh token
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const result = await authService.refreshToken(refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const profile = await authService.getProfile(req.user.id);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   * GET /api/auth/verify-email/:token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      const result = await authService.verifyEmail(token);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      const result = await authService.resendVerificationEmail(email);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout (client-side token removal)
   * POST /api/auth/logout
   */
  async logout(req: AuthRequest, res: Response) {
    // JWT tokens are stateless, so logout is handled client-side
    // We just return success
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  /**
   * Set password from verification token
   * POST /api/auth/set-password
   */
  async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      // Validation
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token and password are required',
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      const result = await authService.setPasswordFromToken(token, password);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify OTP and set password
   * POST /api/auth/verify-otp-and-set-password
   */
  async verifyOTPAndSetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, otp, password } = req.body;

      // Validation
      if (!token || !otp || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token, verification code, and password are required',
        });
      }

      // OTP validation (must be 6 digits)
      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message: 'Verification code must be 6 digits',
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      const result = await authService.verifyOTPAndSetPassword({ token, otp, password });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 1: Verify OTP only (separate endpoint)
   * POST /api/auth/verify-otp
   */
  async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, otp } = req.body;

      // Validation
      if (!token || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Token and verification code are required',
        });
      }

      // OTP validation (must be 6 digits)
      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message: 'Verification code must be 6 digits',
        });
      }

      const result = await authService.verifyOTP({ token, otp });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          sessionToken: result.sessionToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 2: Set password after OTP verification
   * POST /api/auth/set-password-after-otp
   */
  async setPasswordAfterOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionToken, password } = req.body;

      // Validation
      if (!sessionToken || !password) {
        return res.status(400).json({
          success: false,
          message: 'Session token and password are required',
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      const result = await authService.setPasswordAfterOTP({ sessionToken, password });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
