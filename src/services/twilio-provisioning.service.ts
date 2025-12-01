import twilio from 'twilio';
import logger from '../config/logger';
import { AppError } from '../middleware/error.middleware';

/**
 * Twilio Phone Number Provisioning Service
 * Automatically provisions phone numbers for new tenants
 */

// Lazy-load Twilio client
let twilioClient: ReturnType<typeof twilio> | null = null;

const getTwilioClient = () => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
      throw new AppError('Twilio credentials not configured properly', 500);
    }

    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
};

interface PhoneNumberProvisionOptions {
  countryCode?: string; // Default: 'US'
  areaCode?: string; // e.g., '929' for New York
  contains?: string; // Search for numbers containing specific digits
  smsEnabled?: boolean; // Default: true
  voiceEnabled?: boolean; // Default: true
}

export class TwilioProvisioningService {
  /**
   * Search for available phone numbers
   */
  async searchAvailableNumbers(options: PhoneNumberProvisionOptions = {}) {
    try {
      const client = getTwilioClient();
      const countryCode = options.countryCode || 'US';

      const searchParams: any = {
        voiceEnabled: options.voiceEnabled !== false,
        smsEnabled: options.smsEnabled !== false,
      };

      if (options.areaCode) {
        searchParams.areaCode = options.areaCode;
      }

      if (options.contains) {
        searchParams.contains = options.contains;
      }

      const availableNumbers = await client
        .availablePhoneNumbers(countryCode)
        .local.list(searchParams);

      logger.info('Available phone numbers found', {
        count: availableNumbers.length,
        countryCode,
        areaCode: options.areaCode,
      });

      return availableNumbers;
    } catch (error) {
      logger.error('Search available numbers error', { error });
      throw new AppError(
        'Failed to search for available phone numbers',
        500
      );
    }
  }

  /**
   * Purchase a phone number and configure webhooks
   */
  async purchasePhoneNumber(
    phoneNumber: string,
    tenantId: string
  ): Promise<string> {
    try {
      const client = getTwilioClient();
      const apiUrl = process.env.API_URL || 'https://api.firstringai.com';

      // Purchase the phone number
      const incomingPhoneNumber = await client.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        voiceUrl: `${apiUrl}/api/ai-agent/incoming`,
        voiceMethod: 'POST',
        statusCallback: `${apiUrl}/api/ai-agent/status`,
        statusCallbackMethod: 'POST',
        smsUrl: `${apiUrl}/api/ai-agent/sms-incoming`,
        smsMethod: 'POST',
        friendlyName: `Tenant ${tenantId}`,
      });

      logger.info('Phone number purchased successfully', {
        phoneNumber: incomingPhoneNumber.phoneNumber,
        sid: incomingPhoneNumber.sid,
        tenantId,
      });

      return incomingPhoneNumber.phoneNumber;
    } catch (error: any) {
      logger.error('Purchase phone number error', {
        error,
        phoneNumber,
        tenantId,
      });

      if (error.code === 21422) {
        throw new AppError('Phone number is no longer available', 400);
      }

      throw new AppError('Failed to purchase phone number', 500);
    }
  }

  /**
   * Auto-provision phone number for tenant
   * Searches for available number and purchases it automatically
   */
  async autoProvisionForTenant(
    tenantId: string,
    options: PhoneNumberProvisionOptions = {}
  ): Promise<string> {
    try {
      // Search for available numbers
      const availableNumbers = await this.searchAvailableNumbers(options);

      if (availableNumbers.length === 0) {
        throw new AppError(
          'No phone numbers available in the requested area',
          404
        );
      }

      // Pick the first available number
      const selectedNumber = availableNumbers[0].phoneNumber;

      logger.info('Selected phone number for tenant', {
        tenantId,
        phoneNumber: selectedNumber,
      });

      // Purchase the number
      const purchasedNumber = await this.purchasePhoneNumber(
        selectedNumber,
        tenantId
      );

      return purchasedNumber;
    } catch (error) {
      logger.error('Auto-provision phone number error', { error, tenantId });
      throw error;
    }
  }

  /**
   * Release phone number (when tenant is deleted)
   */
  async releasePhoneNumber(phoneNumber: string): Promise<void> {
    try {
      const client = getTwilioClient();

      // Find the phone number SID
      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber,
      });

      if (incomingPhoneNumbers.length === 0) {
        logger.warn('Phone number not found for release', { phoneNumber });
        return;
      }

      // Release (delete) the phone number
      await client
        .incomingPhoneNumbers(incomingPhoneNumbers[0].sid)
        .remove();

      logger.info('Phone number released successfully', { phoneNumber });
    } catch (error) {
      logger.error('Release phone number error', { error, phoneNumber });
      throw new AppError('Failed to release phone number', 500);
    }
  }

  /**
   * Update webhook URLs for existing phone number
   */
  async updateWebhookUrls(
    phoneNumber: string,
    tenantId: string
  ): Promise<void> {
    try {
      const client = getTwilioClient();
      const apiUrl = process.env.API_URL || 'https://api.firstringai.com';

      // Find the phone number SID
      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber,
      });

      if (incomingPhoneNumbers.length === 0) {
        throw new AppError('Phone number not found', 404);
      }

      // Update webhook URLs
      await client
        .incomingPhoneNumbers(incomingPhoneNumbers[0].sid)
        .update({
          voiceUrl: `${apiUrl}/api/ai-agent/incoming`,
          voiceMethod: 'POST',
          statusCallback: `${apiUrl}/api/ai-agent/status`,
          statusCallbackMethod: 'POST',
          smsUrl: `${apiUrl}/api/ai-agent/sms-incoming`,
          smsMethod: 'POST',
          friendlyName: `Tenant ${tenantId}`,
        });

      logger.info('Webhook URLs updated successfully', {
        phoneNumber,
        tenantId,
      });
    } catch (error) {
      logger.error('Update webhook URLs error', { error, phoneNumber });
      throw error;
    }
  }

  /**
   * Get phone number details
   */
  async getPhoneNumberDetails(phoneNumber: string) {
    try {
      const client = getTwilioClient();

      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber,
      });

      if (incomingPhoneNumbers.length === 0) {
        throw new AppError('Phone number not found', 404);
      }

      return incomingPhoneNumbers[0];
    } catch (error) {
      logger.error('Get phone number details error', { error, phoneNumber });
      throw error;
    }
  }
}

export default new TwilioProvisioningService();
