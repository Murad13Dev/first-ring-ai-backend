import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'First Ring AI API',
      version: '1.0.0',
      description: 'Multi-tenant SaaS platform for AI phone agents - API Documentation',
      contact: {
        name: 'First Ring AI Support',
        email: 'support@firstringai.com',
        url: 'https://firstringai.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.firstringai.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['owner', 'manager', 'staff'],
              example: 'owner',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Lead: {
          type: 'object',
          required: ['contactName', 'email', 'phone', 'businessName', 'businessType', 'selectedPlan', 'source'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            source: {
              type: 'string',
              enum: ['landing_page_form', 'ai_call', 'contact_form', 'referral'],
              example: 'landing_page_form',
            },
            contactName: {
              type: 'string',
              example: 'John Smith',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@pizzahouse.com',
            },
            phone: {
              type: 'string',
              example: '+15551234567',
            },
            businessName: {
              type: 'string',
              example: 'Pizza House',
            },
            businessType: {
              type: 'string',
              enum: ['restaurant', 'hotel', 'fitness', 'clinic', 'salon', 'other'],
              example: 'restaurant',
            },
            selectedPlan: {
              type: 'string',
              enum: ['basic', 'pro', 'enterprise'],
              example: 'pro',
            },
            callVolume: {
              type: 'integer',
              example: 30,
            },
            challenges: {
              type: 'string',
              example: 'Missing calls during busy hours',
            },
            requirements: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['new', 'contacted', 'qualified', 'in_progress', 'converted', 'lost'],
              example: 'new',
            },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'hot'],
              example: 'hot',
            },
            qualificationScore: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              example: 85,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'Pizza House',
            },
            businessType: {
              type: 'string',
              enum: ['restaurant', 'hotel', 'fitness', 'clinic', 'salon', 'other'],
              example: 'restaurant',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            phone: {
              type: 'string',
            },
            twilioNumber: {
              type: 'string',
              example: '+15551234567',
            },
            plan: {
              type: 'string',
              enum: ['free', 'basic', 'pro', 'enterprise'],
              example: 'pro',
            },
            subscriptionStatus: {
              type: 'string',
              enum: ['trial', 'active', 'cancelled', 'suspended'],
              example: 'active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Service: {
          type: 'object',
          required: ['name', 'price'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'Margarita Pizza',
            },
            description: {
              type: 'string',
              example: 'Classic pizza with tomato sauce, mozzarella and basil',
            },
            category: {
              type: 'string',
              example: 'Pizza',
            },
            price: {
              type: 'number',
              format: 'float',
              example: 12.99,
            },
            duration: {
              type: 'integer',
              example: 30,
              description: 'Duration in minutes (for services)',
            },
            available: {
              type: 'boolean',
              example: true,
            },
            image: {
              type: 'string',
              format: 'uri',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        FAQ: {
          type: 'object',
          required: ['question', 'answer'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            question: {
              type: 'string',
              example: 'Siz neçədə açılırsınız?',
            },
            answer: {
              type: 'string',
              example: 'Biz hər gün səhər 10-dan gecə 11-ə qədər açıqıq',
            },
            keywords: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['açılış', 'saat', 'hours'],
            },
            category: {
              type: 'string',
              example: 'General',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
          },
        },
        Booking: {
          type: 'object',
          required: ['customerName', 'customerPhone', 'serviceName', 'dateTime'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            customerName: {
              type: 'string',
              example: 'John Doe',
            },
            customerPhone: {
              type: 'string',
              example: '+15551234567',
            },
            customerEmail: {
              type: 'string',
              format: 'email',
            },
            serviceName: {
              type: 'string',
              example: 'Table for 4',
            },
            dateTime: {
              type: 'string',
              format: 'date-time',
              example: '2024-12-01T19:00:00Z',
            },
            partySize: {
              type: 'integer',
              example: 4,
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
              example: 'confirmed',
            },
            notes: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Order: {
          type: 'object',
          required: ['customerPhone', 'items', 'total'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            customerPhone: {
              type: 'string',
              example: '+15551234567',
            },
            customerName: {
              type: 'string',
              example: 'John Doe',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  serviceId: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  quantity: { type: 'integer' },
                  modifiers: { type: 'object' },
                },
              },
            },
            subtotal: {
              type: 'number',
              format: 'float',
              example: 45.50,
            },
            tax: {
              type: 'number',
              format: 'float',
              example: 4.55,
            },
            total: {
              type: 'number',
              format: 'float',
              example: 50.05,
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'paid', 'failed', 'refunded'],
              example: 'paid',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
              example: 'preparing',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Leads',
        description: 'Lead generation and management',
      },
      {
        name: 'Tenants',
        description: 'Tenant management (admin)',
      },
      {
        name: 'Services',
        description: 'Services/Menu management',
      },
      {
        name: 'FAQs',
        description: 'FAQ management',
      },
      {
        name: 'Bookings',
        description: 'Booking/Reservation management',
      },
      {
        name: 'Orders',
        description: 'Order management',
      },
      {
        name: 'Calls',
        description: 'Call logs and analytics',
      },
      {
        name: 'AI Agent',
        description: 'AI phone agent endpoints',
      },
      {
        name: 'Integrations',
        description: 'Third-party integrations',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting',
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/server.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
