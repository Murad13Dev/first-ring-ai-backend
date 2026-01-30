import Twilio from 'twilio';
import logger from '../config/logger';

export type SMSType = 'reminder' | 'confirmation' | 'notification' | 'verification' | 'marketing';

interface SendSMSOptions {
  to: string;
  message: string;
  type?: SMSType;
  tenantId?: string;
  metadata?: Record<string, any>;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private client: Twilio.Twilio | null = null;
  private fromNumber: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && phoneNumber) {
      this.client = Twilio(accountSid, authToken);
      this.fromNumber = phoneNumber;
      logger.info('SMS Service initialized with Twilio');
    } else {
      logger.warn('SMS Service: Twilio credentials not configured');
    }
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.fromNumber !== null;
  }

  /**
   * Send SMS message
   */
  async send(options: SendSMSOptions): Promise<SMSResult> {
    const { to, message, type = 'notification', tenantId, metadata } = options;

    if (!this.isConfigured()) {
      logger.warn('SMS not sent - Twilio not configured', { to, type });
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      // Validate phone number format
      const formattedPhone = this.formatPhoneNumber(to);
      if (!formattedPhone) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Send SMS via Twilio
      const result = await this.client!.messages.create({
        body: message,
        from: this.fromNumber!,
        to: formattedPhone,
      });

      logger.info('SMS sent successfully', {
        messageId: result.sid,
        to: formattedPhone,
        type,
        tenantId,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      logger.error('SMS send failed', {
        error: error.message,
        to,
        type,
        tenantId,
      });

      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send booking reminder SMS
   */
  async sendBookingReminder(params: {
    to: string;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    businessName: string;
    timeframe: string;
    tenantId?: string;
  }): Promise<SMSResult> {
    const message = `Hi ${params.customerName}! Reminder: Your ${params.serviceName} appointment at ${params.businessName} is in ${params.timeframe} (${params.date} at ${params.time}). Reply HELP for assistance.`;

    return this.send({
      to: params.to,
      message,
      type: 'reminder',
      tenantId: params.tenantId,
    });
  }

  /**
   * Send booking confirmation SMS
   */
  async sendBookingConfirmation(params: {
    to: string;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    businessName: string;
    confirmationCode?: string;
    tenantId?: string;
  }): Promise<SMSResult> {
    let message = `Hi ${params.customerName}! Your ${params.serviceName} appointment at ${params.businessName} is confirmed for ${params.date} at ${params.time}.`;

    if (params.confirmationCode) {
      message += ` Confirmation: ${params.confirmationCode}`;
    }

    return this.send({
      to: params.to,
      message,
      type: 'confirmation',
      tenantId: params.tenantId,
    });
  }

  /**
   * Send order status update SMS
   */
  async sendOrderUpdate(params: {
    to: string;
    customerName: string;
    orderId: string;
    status: string;
    businessName: string;
    tenantId?: string;
  }): Promise<SMSResult> {
    const statusMessages: Record<string, string> = {
      confirmed: 'has been confirmed',
      preparing: 'is being prepared',
      ready: 'is ready for pickup',
      out_for_delivery: 'is out for delivery',
      delivered: 'has been delivered',
      cancelled: 'has been cancelled',
    };

    const statusText = statusMessages[params.status] || `status: ${params.status}`;
    const message = `Hi ${params.customerName}! Your order #${params.orderId} from ${params.businessName} ${statusText}.`;

    return this.send({
      to: params.to,
      message,
      type: 'notification',
      tenantId: params.tenantId,
    });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(params: {
    to: string;
    code: string;
    expiresInMinutes?: number;
  }): Promise<SMSResult> {
    const expiry = params.expiresInMinutes || 10;
    const message = `Your verification code is: ${params.code}. This code expires in ${expiry} minutes. Do not share this code with anyone.`;

    return this.send({
      to: params.to,
      message,
      type: 'verification',
    });
  }

  /**
   * Send custom notification SMS
   */
  async sendNotification(params: {
    to: string;
    message: string;
    tenantId?: string;
  }): Promise<SMSResult> {
    return this.send({
      to: params.to,
      message: params.message,
      type: 'notification',
      tenantId: params.tenantId,
    });
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with +, validate it
    if (cleaned.startsWith('+')) {
      if (cleaned.length >= 11 && cleaned.length <= 15) {
        return cleaned;
      }
      return null;
    }

    // If it's a US number (10 digits), add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    // If it's 11 digits starting with 1 (US), add +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    // For other formats, try adding + if length is reasonable
    if (cleaned.length >= 10 && cleaned.length <= 14) {
      return `+${cleaned}`;
    }

    return null;
  }

  /**
   * Get SMS delivery status
   */
  async getMessageStatus(messageId: string): Promise<{
    status: string;
    errorCode?: number;
    errorMessage?: string;
  } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const message = await this.client!.messages(messageId).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error) {
      logger.error('Failed to get message status', { error, messageId });
      return null;
    }
  }
}

export const smsService = new SMSService();
export default smsService;
