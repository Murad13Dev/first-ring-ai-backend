import prisma from '../config/database';
import logger from '../config/logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: ServiceHealth;
    retell?: ServiceHealth;
    twilio?: ServiceHealth;
    stripe?: ServiceHealth;
    memory: MemoryHealth;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  error?: string;
  details?: Record<string, any>;
}

interface MemoryHealth {
  status: 'up' | 'down' | 'degraded';
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  percentUsed: number;
}

class HealthService {
  private startTime = Date.now();

  /**
   * Run comprehensive health check
   */
  async check(includeExternal: boolean = false): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
    };

    // Only check external services if requested (slower)
    if (includeExternal) {
      checks.retell = await this.checkRetell();
      checks.twilio = await this.checkTwilio();
      checks.stripe = await this.checkStripe();
    }

    // Determine overall status
    const statuses = Object.values(checks).map((c) => c.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (statuses.includes('down')) {
      // If database is down, system is unhealthy
      if (checks.database.status === 'down') {
        overallStatus = 'unhealthy';
      } else {
        overallStatus = 'degraded';
      }
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
    };
  }

  /**
   * Quick health check (database only)
   */
  async quickCheck(): Promise<{ status: 'ok' | 'error'; database: boolean }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: true };
    } catch {
      return { status: 'error', database: false };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();

    try {
      // Simple query to check connection
      await prisma.$queryRaw`SELECT 1`;

      // Get database stats
      const [tenantCount, userCount, callCount] = await Promise.all([
        prisma.tenant.count(),
        prisma.user.count(),
        prisma.call.count(),
      ]);

      return {
        status: 'up',
        latencyMs: Date.now() - start,
        details: {
          tenants: tenantCount,
          users: userCount,
          calls: callCount,
        },
      };
    } catch (error: any) {
      logger.error('Database health check failed', { error });
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error.message || 'Database connection failed',
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): MemoryHealth {
    const usage = process.memoryUsage();
    const percentUsed = Math.round((usage.heapUsed / usage.heapTotal) * 100);

    let status: 'up' | 'down' | 'degraded' = 'up';
    if (percentUsed > 90) {
      status = 'degraded';
    }

    return {
      status,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      percentUsed,
    };
  }

  /**
   * Check Retell API connectivity
   */
  private async checkRetell(): Promise<ServiceHealth> {
    const start = Date.now();

    if (!process.env.RETELL_API_KEY) {
      return {
        status: 'down',
        error: 'RETELL_API_KEY not configured',
      };
    }

    try {
      const response = await fetch('https://api.retellai.com/v2/agent', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        },
      });

      if (response.ok || response.status === 401) {
        // 401 means API is reachable but key may be invalid
        return {
          status: response.ok ? 'up' : 'degraded',
          latencyMs: Date.now() - start,
          details: {
            statusCode: response.status,
          },
        };
      }

      return {
        status: 'degraded',
        latencyMs: Date.now() - start,
        error: `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error.message || 'Failed to connect to Retell API',
      };
    }
  }

  /**
   * Check Twilio API connectivity
   */
  private async checkTwilio(): Promise<ServiceHealth> {
    const start = Date.now();

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return {
        status: 'down',
        error: 'Twilio credentials not configured',
      };
    }

    try {
      const credentials = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64');

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json() as { status: string; friendly_name: string };
        return {
          status: 'up',
          latencyMs: Date.now() - start,
          details: {
            accountStatus: data.status,
            friendlyName: data.friendly_name,
          },
        };
      }

      return {
        status: 'degraded',
        latencyMs: Date.now() - start,
        error: `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error.message || 'Failed to connect to Twilio API',
      };
    }
  }

  /**
   * Check Stripe API connectivity
   */
  private async checkStripe(): Promise<ServiceHealth> {
    const start = Date.now();

    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: 'down',
        error: 'STRIPE_SECRET_KEY not configured',
      };
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      });

      if (response.ok) {
        return {
          status: 'up',
          latencyMs: Date.now() - start,
        };
      }

      return {
        status: 'degraded',
        latencyMs: Date.now() - start,
        error: `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error.message || 'Failed to connect to Stripe API',
      };
    }
  }
}

export const healthService = new HealthService();
export default healthService;
