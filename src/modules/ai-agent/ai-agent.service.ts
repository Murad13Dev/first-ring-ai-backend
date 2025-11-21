import twilio from 'twilio';
import axios from 'axios';
import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import faqsService from '../faqs/faqs.service';
import bookingsService from '../bookings/bookings.service';
import ordersService from '../orders/orders.service';
import leadsService from '../leads/leads.service';
import i18nService from '../../services/i18n.service';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface AIAgentContext {
  tenantId: string;
  tenant: any;
  fromNumber: string;
  toNumber: string;
  language: string;
  conversationHistory: Array<{ role: string; content: string }>;
  detectedIntent?: string;
  entities?: any;
}

export class AIAgentService {
  /**
   * Handle incoming call from Twilio
   */
  async handleIncomingCall(callSid: string, from: string, to: string) {
    try {
      // Find tenant by Twilio number
      const tenant = await prisma.tenant.findUnique({
        where: { twilioNumber: to },
        include: {
          services: { where: { available: true } },
          faqs: { where: { isActive: true } },
        },
      });

      if (!tenant) {
        logger.warn('Incoming call to unknown number', { to });
        throw new AppError('Tenant not found', 404);
      }

      // Detect language from phone number
      const language = i18nService.detectLanguage(from);

      // Initialize context
      const context: AIAgentContext = {
        tenantId: tenant.id,
        tenant,
        fromNumber: from,
        toNumber: to,
        language,
        conversationHistory: [],
      };

      // Generate greeting
      const greeting = this.generateGreeting(tenant, language);

      logger.info('Incoming call handled', {
        callSid,
        tenantId: tenant.id,
        from,
        language,
      });

      return {
        greeting,
        context,
        tenant,
        language,
        twilioLanguage: i18nService.getTwilioLanguage(language),
      };
    } catch (error) {
      logger.error('Handle incoming call error', { error });
      throw error;
    }
  }

  /**
   * Process user input and generate AI response
   */
  async processUserInput(
    context: AIAgentContext,
    userInput: string
  ): Promise<{
    response: string;
    intent: string;
    confidence: number;
    action?: any;
  }> {
    try {
      // Add user input to history
      context.conversationHistory.push({
        role: 'user',
        content: userInput,
      });

      // Detect intent using OpenAI
      const intentResult = await this.detectIntent(userInput, context);

      // Handle based on intent
      let response = '';
      let action: any = null;

      switch (intentResult.intent) {
        case 'faq':
          response = await this.handleFAQIntent(userInput, context);
          break;

        case 'booking':
          const bookingResult = await this.handleBookingIntent(
            userInput,
            context
          );
          response = bookingResult.response;
          action = bookingResult.action;
          break;

        case 'order':
          const orderResult = await this.handleOrderIntent(userInput, context);
          response = orderResult.response;
          action = orderResult.action;
          break;

        case 'lead':
          const leadResult = await this.handleLeadIntent(userInput, context);
          response = leadResult.response;
          action = leadResult.action;
          break;

        case 'escalation':
          response = await this.handleEscalation(context);
          action = { type: 'transfer', number: context.tenant.phone };
          break;

        default:
          response = await this.handleUnknownIntent(userInput, context);
      }

      // Add AI response to history
      context.conversationHistory.push({
        role: 'assistant',
        content: response,
      });

      return {
        response,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        action,
      };
    } catch (error) {
      logger.error('Process user input error', { error });
      throw error;
    }
  }

  /**
   * Detect intent using OpenAI GPT-4
   */
  private async detectIntent(
    userInput: string,
    context: AIAgentContext
  ): Promise<{ intent: string; confidence: number; entities?: any }> {
    try {
      const prompt = `
You are an AI assistant for ${context.tenant.name}, a ${context.tenant.businessType}.

Analyze the following user input and detect the intent:
User: "${userInput}"

Available intents:
- faq: General questions (hours, location, services, pricing)
- booking: Reservation or appointment requests
- order: Food/product ordering
- lead: Sales inquiry, wants to become a customer
- escalation: User wants to speak with a human
- unknown: Cannot determine

Respond with JSON:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": {}
}
`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = JSON.parse(
        response.data.choices[0].message.content
      );

      logger.info('Intent detected', {
        intent: result.intent,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Intent detection error', { error });
      return {
        intent: 'unknown',
        confidence: 0,
      };
    }
  }

  /**
   * Handle FAQ intent
   */
  private async handleFAQIntent(
    userInput: string,
    context: AIAgentContext
  ): Promise<string> {
    try {
      // Search FAQ database
      const faqResult = await faqsService.searchFAQs(
        context.tenantId,
        userInput
      );

      if (faqResult.found && faqResult.confidence! > 0.5) {
        return faqResult.faq!.answer;
      }

      // If no FAQ found, use AI to generate response
      return await this.generateAIResponse(userInput, context);
    } catch (error) {
      logger.error('Handle FAQ intent error', { error });
      return 'Sorry, I could not find information about this question.';
    }
  }

  /**
   * Handle booking intent
   */
  private async handleBookingIntent(
    userInput: string,
    context: AIAgentContext
  ): Promise<{ response: string; action?: any }> {
    try {
      // Extract booking details using OpenAI
      const details = await this.extractBookingDetails(userInput, context);

      if (!details.complete) {
        // Ask for missing information
        return {
          response: details.question || 'How many people and what date would you like to book?',
        };
      }

      // Check availability
      const isAvailable = await bookingsService.checkAvailability(
        context.tenantId,
        details.dateTime,
        details.duration || 60
      );

      if (!isAvailable) {
        return {
          response: 'Unfortunately, this time slot is not available. Can I suggest another time?',
        };
      }

      // Create booking
      const booking = await bookingsService.createBooking({
        tenantId: context.tenantId,
        customerName: details.name || 'Customer',
        customerPhone: context.fromNumber,
        customerEmail: details.email,
        serviceName: details.serviceName || 'Reservation',
        dateTime: details.dateTime,
        duration: details.duration,
        partySize: details.partySize,
      });

      return {
        response: `Great! Your reservation is confirmed. Table for ${details.partySize} on ${details.dateTime.toLocaleDateString('en-US')} at ${details.dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. Reservation code: ${booking.id.slice(0, 8)}`,
        action: {
          type: 'booking_created',
          bookingId: booking.id,
        },
      };
    } catch (error) {
      logger.error('Handle booking intent error', { error });
      return {
        response: 'Sorry, there was a problem creating the reservation.',
      };
    }
  }

  /**
   * Handle order intent
   */
  private async handleOrderIntent(
    userInput: string,
    context: AIAgentContext
  ): Promise<{ response: string; action?: any }> {
    try {
      // Extract order items
      const items = await this.extractOrderItems(userInput, context);

      if (items.length === 0) {
        return {
          response: 'What would you like to order?',
        };
      }

      // Create order
      const order = await ordersService.createOrder({
        tenantId: context.tenantId,
        customerPhone: context.fromNumber,
        items,
      });

      // Create payment link
      const checkout = await ordersService.createCheckoutLink(
        order.id,
        context.tenantId
      );

      return {
        response: `Your order is ready! Total: $${order.total.toFixed(2)}. Payment link sent via SMS.`,
        action: {
          type: 'order_created',
          orderId: order.id,
          checkoutUrl: checkout.checkoutUrl,
        },
      };
    } catch (error) {
      logger.error('Handle order intent error', { error });
      return {
        response: 'Sorry, there was a problem creating the order.',
      };
    }
  }

  /**
   * Handle lead intent (sales inquiry)
   */
  private async handleLeadIntent(
    userInput: string,
    context: AIAgentContext
  ): Promise<{ response: string; action?: any }> {
    try {
      // Extract contact details
      const details = await this.extractLeadDetails(userInput, context);

      if (!details.complete) {
        return {
          response: details.question || 'How can we contact you? Email or phone?',
        };
      }

      // Create lead
      const lead = await leadsService.createLead({
        source: 'ai_call',
        contactName: details.name,
        email: details.email,
        phone: context.fromNumber,
        businessName: details.businessName || 'Unknown',
        businessType: details.businessType || 'other',
        selectedPlan: details.plan || 'basic',
        callVolume: details.callVolume,
        challenges: details.challenges,
        aiNotes: userInput,
      });

      return {
        response: 'Thank you! Your information has been recorded. Our team will contact you within 24 hours.',
        action: {
          type: 'lead_created',
          leadId: lead.id,
        },
      };
    } catch (error) {
      logger.error('Handle lead intent error', { error });
      return {
        response: 'Your information has been recorded. We will contact you soon.',
      };
    }
  }

  /**
   * Handle escalation to human
   */
  private async handleEscalation(
    context: AIAgentContext
  ): Promise<string> {
    return `I understand, I'm connecting you to an operator. One moment...`;
  }

  /**
   * Handle unknown intent
   */
  private async handleUnknownIntent(
    userInput: string,
    context: AIAgentContext
  ): Promise<string> {
    // Try to generate intelligent response using AI
    return await this.generateAIResponse(userInput, context);
  }

  /**
   * Generate AI response using GPT-4
   */
  private async generateAIResponse(
    userInput: string,
    context: AIAgentContext
  ): Promise<string> {
    try {
      const systemPrompt = i18nService.getOpenAISystemPrompt(
        context.language,
        context.tenant.name,
        context.tenant.businessType
      );

      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...context.conversationHistory,
      ];

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages,
          temperature: 0.7,
          max_tokens: 150,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('Generate AI response error', { error });
      return i18nService.t(context.language, 'errors.not_understood');
    }
  }

  /**
   * Generate greeting message
   */
  private generateGreeting(tenant: any, language: string): string {
    return i18nService.t(language, 'greeting.welcome', {
      businessName: tenant.name,
    });
  }

  /**
   * Extract booking details from user input
   */
  private async extractBookingDetails(
    userInput: string,
    context: AIAgentContext
  ): Promise<any> {
    // Use OpenAI to extract structured data
    // This is a simplified version - full implementation would use function calling
    return {
      complete: false,
      question: 'What date and time would you like to make a reservation for?',
    };
  }

  /**
   * Extract order items from user input
   */
  private async extractOrderItems(
    userInput: string,
    context: AIAgentContext
  ): Promise<any[]> {
    // Use OpenAI to match user input with available services
    return [];
  }

  /**
   * Extract lead details from user input
   */
  private async extractLeadDetails(
    userInput: string,
    context: AIAgentContext
  ): Promise<any> {
    return {
      complete: false,
      question: 'What is your name and email address?',
    };
  }

  /**
   * Make outbound call (cold calling)
   */
  async makeOutboundCall(
    tenantId: string,
    toNumber: string,
    script: string
  ) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant || !tenant.twilioNumber) {
        throw new AppError('Tenant or Twilio number not found', 404);
      }

      const call = await twilioClient.calls.create({
        to: toNumber,
        from: tenant.twilioNumber,
        url: `${process.env.API_URL}/api/ai-agent/outbound-twiml?tenantId=${tenantId}`,
      });

      logger.info('Outbound call initiated', {
        callSid: call.sid,
        tenantId,
        to: toNumber,
      });

      return call;
    } catch (error) {
      logger.error('Make outbound call error', { error });
      throw error;
    }
  }

  /**
   * Log call to database
   */
  async logCall(data: {
    tenantId: string;
    fromNumber: string;
    toNumber: string;
    direction: 'inbound' | 'outbound';
    duration: number;
    transcript?: string;
    intent?: string;
    outcome?: string;
    aiConfidence?: number;
    bookingId?: string;
    orderId?: string;
    leadId?: string;
  }) {
    try {
      const call = await prisma.call.create({
        data,
      });

      logger.info('Call logged', { callId: call.id });

      return call;
    } catch (error) {
      logger.error('Log call error', { error });
      throw error;
    }
  }
}

export default new AIAgentService();
