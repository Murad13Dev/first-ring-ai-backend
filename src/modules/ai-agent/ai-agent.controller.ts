import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import aiAgentService from './ai-agent.service';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export class AIAgentController {
  /**
   * Handle incoming call webhook from Twilio
   * POST /api/ai-agent/incoming
   */
  async handleIncomingCall(req: Request, res: Response, next: NextFunction) {
    try {
      const { CallSid, From, To } = req.body;

      const result = await aiAgentService.handleIncomingCall(
        CallSid,
        From,
        To
      );

      // Generate TwiML response
      const twiml = new VoiceResponse();
      
      // Gather user input with detected language
      const gather = twiml.gather({
        input: ['speech'],
        action: '/api/ai-agent/process',
        method: 'POST',
        language: result.twilioLanguage as any,
        speechTimeout: 'auto',
      });

      gather.say(
        { voice: 'alice', language: result.twilioLanguage as any },
        result.greeting
      );

      // If no input, repeat
      twiml.say(
        { voice: 'alice', language: result.twilioLanguage as any },
        result.greeting
      );
      twiml.redirect('/api/ai-agent/incoming');

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process user speech input
   * POST /api/ai-agent/process
   */
  async processUserInput(req: Request, res: Response, next: NextFunction) {
    try {
      const { SpeechResult, CallSid, From, To } = req.body;

      // Get context from session (in production, use Redis)
      // For now, we'll create new context
      const contextResult = await aiAgentService.handleIncomingCall(
        CallSid,
        From,
        To
      );

      const context = contextResult.context;

      // Process input
      const result = await aiAgentService.processUserInput(
        context,
        SpeechResult
      );

      // Log call
      await aiAgentService.logCall({
        tenantId: context.tenantId,
        fromNumber: From,
        toNumber: To,
        direction: 'inbound',
        duration: 0, // Will be updated later
        transcript: SpeechResult,
        intent: result.intent,
        outcome: 'completed',
        aiConfidence: result.confidence,
        bookingId: result.action?.bookingId,
        orderId: result.action?.orderId,
        leadId: result.action?.leadId,
      });

      // Generate TwiML response
      const twiml = new VoiceResponse();

      // Handle actions
      if (result.action?.type === 'transfer') {
        twiml.say(
          { voice: 'alice', language: 'en-US' },
          result.response
        );
        twiml.dial(result.action.number);
      } else {
        // Continue conversation
        const gather = twiml.gather({
          input: ['speech'],
          action: '/api/ai-agent/process',
          method: 'POST',
          language: 'en-US',
          speechTimeout: 'auto',
        });

        gather.say(
          { voice: 'alice', language: 'en-US' },
          result.response
        );

        // If no input, end call
        twiml.say(
          { voice: 'alice', language: 'en-US' },
          'Thank you. Goodbye!'
        );
        twiml.hangup();
      }

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle call status updates
   * POST /api/ai-agent/status
   */
  async handleCallStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;

      // Update call duration in database
      // TODO: Implement

      res.status(200).send('OK');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate outbound call
   * POST /api/ai-agent/outbound
   */
  async initiateOutboundCall(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.tenantId!;
      const { toNumber, script } = req.body;

      if (!toNumber) {
        return res.status(400).json({
          success: false,
          message: 'toNumber is required',
        });
      }

      const call = await aiAgentService.makeOutboundCall(
        tenantId,
        toNumber,
        script
      );

      return res.status(200).json({
        success: true,
        message: 'Outbound call initiated',
        data: {
          callSid: call.sid,
          status: call.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate TwiML for outbound call
   * GET /api/ai-agent/outbound-twiml
   */
  async generateOutboundTwiML(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.query;

      const twiml = new VoiceResponse();
      
      const gather = twiml.gather({
        input: ['speech'],
        action: '/api/ai-agent/process',
        method: 'POST',
        language: 'en-US',
        speechTimeout: 'auto',
      });

      gather.say(
        { voice: 'alice', language: 'en-US' },
        'Hello! This is First Ring AI calling. Do you have a minute?'
      );

      twiml.say(
        { voice: 'alice', language: 'en-US' },
        'Thank you.'
      );
      twiml.hangup();

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send SMS
   * POST /api/ai-agent/sms
   */
  async sendSMS(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({
          success: false,
          message: 'to and message are required',
        });
      }

      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const sms = await client.messages.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: message,
      });

      return res.status(200).json({
        success: true,
        message: 'SMS sent',
        data: {
          sid: sms.sid,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test AI agent (for development)
   * POST /api/ai-agent/test
   */
  async testAIAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userInput } = req.body;
      const tenantId = req.tenantId!;

      if (!userInput) {
        return res.status(400).json({
          success: false,
          message: 'userInput is required',
        });
      }

      // Create mock context
      const tenant = await require('../../config/database').default.tenant.findUnique({
        where: { id: tenantId },
      });

      const context = {
        tenantId,
        tenant,
        fromNumber: '+15551234567',
        toNumber: tenant.twilioNumber || '+15557654321',
        conversationHistory: [],
        language: 'en-US',
      };

      const result = await aiAgentService.processUserInput(
        context,
        userInput
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AIAgentController();
