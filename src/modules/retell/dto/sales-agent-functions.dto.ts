/**
 * Sales Agent Function Definitions for Retell AI
 * These functions are called by the AI during sales conversations
 */

export const SALES_AGENT_FUNCTIONS = [
  {
    name: 'create_sales_lead',
    description: 'Creates a new sales lead in the database when customer provides their business information',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Customer full name (e.g., "Dr. Sarah Johnson")',
        },
        email: {
          type: 'string',
          description: 'Customer email address for sending pricing packages',
        },
        phone: {
          type: 'string',
          description: 'Customer phone number with country code (e.g., "+1-555-0123")',
        },
        businessName: {
          type: 'string',
          description: 'Name of their business (e.g., "Smile Bright Dental")',
        },
        businessType: {
          type: 'string',
          enum: [
            'restaurant',
            'retail_store',
            'medical',
            'dental',
            'hotel',
            'salon',
            'real_estate',
            'other',
          ],
          description: 'Type of business they operate',
        },
        companySize: {
          type: 'string',
          enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
          description: 'Number of employees',
        },
        dailyCallVolume: {
          type: 'number',
          description: 'Approximate number of calls they receive per day',
        },
        desiredFeatures: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'appointment_booking',
              'order_taking',
              'faq_handling',
              'lead_capture',
              'call_routing',
            ],
          },
          description: 'Features they want in their AI agent',
        },
        painPoints: {
          type: 'string',
          description: 'Current challenges they face with customer calls',
        },
        timeline: {
          type: 'string',
          enum: ['immediate', '1-2_weeks', '1_month', '3_months', 'just_exploring'],
          description: 'When they want to get started',
        },
        budgetRange: {
          type: 'string',
          enum: ['starter', 'professional', 'enterprise', 'not_discussed'],
          description: 'Their budget range or plan interest',
        },
        notes: {
          type: 'string',
          description: 'Any additional relevant information from the conversation',
        },
      },
      required: ['name', 'email', 'businessName', 'businessType'],
    },
  },
  {
    name: 'send_pricing_packages',
    description: 'Sends detailed pricing packages to customer email address',
    parameters: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Customer email address',
        },
        businessType: {
          type: 'string',
          description: 'Type of business to customize the email content',
        },
        customerName: {
          type: 'string',
          description: 'Customer name for personalization',
        },
        recommendedPlan: {
          type: 'string',
          enum: ['starter', 'professional', 'enterprise'],
          description: 'Recommended plan based on their needs',
        },
      },
      required: ['email', 'businessType', 'customerName'],
    },
  },
  {
    name: 'schedule_demo',
    description: 'Schedules a product demo with the sales team',
    parameters: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Customer email address',
        },
        preferredDate: {
          type: 'string',
          description: 'Preferred date in YYYY-MM-DD format',
        },
        preferredTime: {
          type: 'string',
          description: 'Preferred time in HH:MM format (24-hour)',
        },
        timezone: {
          type: 'string',
          description: 'Customer timezone (e.g., "America/New_York")',
        },
        notes: {
          type: 'string',
          description: 'Any specific topics they want to discuss in the demo',
        },
      },
      required: ['email', 'preferredDate', 'preferredTime'],
    },
  },
  {
    name: 'check_feature_availability',
    description: 'Checks if a specific feature or integration is available in our platform',
    parameters: {
      type: 'object',
      properties: {
        featureName: {
          type: 'string',
          description: 'Name of the feature or integration they are asking about',
        },
        businessType: {
          type: 'string',
          description: 'Their business type to provide relevant information',
        },
      },
      required: ['featureName'],
    },
  },
];

export interface CreateSalesLeadDto {
  name: string;
  email: string;
  phone?: string;
  businessName: string;
  businessType: string;
  companySize?: string;
  dailyCallVolume?: number;
  desiredFeatures?: string[];
  painPoints?: string;
  timeline?: string;
  budgetRange?: string;
  notes?: string;
}

export interface SendPricingPackagesDto {
  email: string;
  businessType: string;
  customerName: string;
  recommendedPlan?: string;
}

export interface ScheduleDemoDto {
  email: string;
  preferredDate: string;
  preferredTime: string;
  timezone?: string;
  notes?: string;
}

export interface CheckFeatureAvailabilityDto {
  featureName: string;
  businessType?: string;
}
