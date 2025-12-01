import axios from 'axios';
import logger from '../config/logger';
import { AppError } from '../middleware/error.middleware';
import i18nService from './i18n.service';

/**
 * Retell AI Agent Provisioning Service
 * Automatically creates and configures Retell AI agents for new tenants
 */

interface CreateAgentOptions {
  tenantId: string;
  tenantName: string;
  businessType: string;
  language?: string;
  voiceId?: string;
}

export class RetellProvisioningService {
  private readonly retellApiUrl = 'https://api.retellai.com/v2';
  private readonly retellApiKey = process.env.RETELL_API_KEY;

  /**
   * Create a new Retell AI agent for tenant
   */
  async createAgentForTenant(
    options: CreateAgentOptions
  ): Promise<string> {
    try {
      if (!this.retellApiKey) {
        throw new AppError('Retell API key not configured', 500);
      }

      const {
        tenantId,
        tenantName,
        businessType,
        language = 'en-US',
        voiceId,
      } = options;

      // Generate system prompt based on business type
      const systemPrompt = this.generateSystemPrompt(
        tenantName,
        businessType,
        language
      );

      // Prepare agent configuration
      const agentConfig = {
        agent_name: `${tenantName} AI Agent`,
        voice_id: voiceId || this.getDefaultVoiceId(language),
        language: language,
        response_engine: {
          type: 'retell-llm',
          llm_id: 'gpt-4',
        },
        general_prompt: systemPrompt,
        general_tools: [
          {
            type: 'end_call',
            name: 'end_call',
            description: 'End the call when conversation is complete',
          },
          {
            type: 'custom',
            name: 'check_availability',
            url: `${process.env.API_URL}/api/retell/functions/${tenantId}`,
            description: 'Check service or product availability',
          },
          {
            type: 'custom',
            name: 'book_appointment',
            url: `${process.env.API_URL}/api/retell/functions/${tenantId}`,
            description: 'Book an appointment or reservation',
          },
          {
            type: 'custom',
            name: 'create_order',
            url: `${process.env.API_URL}/api/retell/functions/${tenantId}`,
            description: 'Create a new order',
          },
          {
            type: 'custom',
            name: 'answer_faq',
            url: `${process.env.API_URL}/api/retell/functions/${tenantId}`,
            description: 'Answer frequently asked questions',
          },
        ],
        begin_message: this.getBeginMessage(tenantName, language),
        boosted_keywords: this.getBusinessKeywords(businessType),
        opt_out_sensitive_data_storage: false,
        pronunciation_dictionary: [],
        normalize_for_speech: true,
        responsiveness: 0.8,
        interruption_sensitivity: 0.5,
        enable_backchannel: true,
        backchannel_frequency: 0.8,
        reminder_trigger_ms: 10000,
        reminder_max_count: 2,
        ambient_sound: 'coffee-shop',
        ambient_sound_volume: 0.3,
      };

      // Create agent via Retell API
      const response = await axios.post(
        `${this.retellApiUrl}/create-agent`,
        agentConfig,
        {
          headers: {
            Authorization: `Bearer ${this.retellApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const agentId = response.data.agent_id;

      logger.info('Retell agent created successfully', {
        agentId,
        tenantId,
        tenantName,
      });

      return agentId;
    } catch (error: any) {
      logger.error('Create Retell agent error', {
        error: error.response?.data || error.message,
        tenantId: options.tenantId,
      });

      if (error.response?.status === 401) {
        throw new AppError('Invalid Retell API key', 500);
      }

      throw new AppError('Failed to create Retell AI agent', 500);
    }
  }

  /**
   * Update existing agent configuration
   */
  async updateAgent(
    agentId: string,
    updates: Partial<CreateAgentOptions>
  ): Promise<void> {
    try {
      if (!this.retellApiKey) {
        throw new AppError('Retell API key not configured', 500);
      }

      const updateData: any = {};

      if (updates.tenantName) {
        updateData.agent_name = `${updates.tenantName} AI Agent`;
      }

      if (updates.language) {
        updateData.language = updates.language;
        updateData.voice_id = this.getDefaultVoiceId(updates.language);
      }

      if (updates.businessType && updates.tenantName) {
        updateData.general_prompt = this.generateSystemPrompt(
          updates.tenantName,
          updates.businessType,
          updates.language || 'en-US'
        );
        updateData.boosted_keywords = this.getBusinessKeywords(
          updates.businessType
        );
      }

      await axios.patch(
        `${this.retellApiUrl}/update-agent/${agentId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${this.retellApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Retell agent updated successfully', { agentId });
    } catch (error: any) {
      logger.error('Update Retell agent error', {
        error: error.response?.data || error.message,
        agentId,
      });
      throw new AppError('Failed to update Retell AI agent', 500);
    }
  }

  /**
   * Delete agent (when tenant is deleted)
   */
  async deleteAgent(agentId: string): Promise<void> {
    try {
      if (!this.retellApiKey) {
        throw new AppError('Retell API key not configured', 500);
      }

      await axios.delete(`${this.retellApiUrl}/delete-agent/${agentId}`, {
        headers: {
          Authorization: `Bearer ${this.retellApiKey}`,
        },
      });

      logger.info('Retell agent deleted successfully', { agentId });
    } catch (error: any) {
      logger.error('Delete Retell agent error', {
        error: error.response?.data || error.message,
        agentId,
      });
      throw new AppError('Failed to delete Retell AI agent', 500);
    }
  }

  /**
   * Get agent details
   */
  async getAgentDetails(agentId: string) {
    try {
      if (!this.retellApiKey) {
        throw new AppError('Retell API key not configured', 500);
      }

      const response = await axios.get(
        `${this.retellApiUrl}/get-agent/${agentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.retellApiKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Get Retell agent error', {
        error: error.response?.data || error.message,
        agentId,
      });
      throw new AppError('Failed to get Retell AI agent details', 500);
    }
  }

  /**
   * Generate system prompt based on business type
   */
  private generateSystemPrompt(
    tenantName: string,
    businessType: string,
    language: string
  ): string {
    const prompts: Record<string, string> = {
      restaurant: `You are a friendly AI assistant for ${tenantName}, a restaurant. Help customers with:
- Menu inquiries and recommendations
- Table reservations and bookings
- Order placement for delivery or pickup
- Business hours, location, and contact information
- Special dietary requirements and allergen information

Always be polite, helpful, and professional. If you cannot help with something, offer to transfer to a human staff member.`,

      hotel: `You are a professional AI concierge for ${tenantName}, a hotel. Assist guests with:
- Room availability and booking inquiries
- Hotel amenities and services
- Check-in/check-out times and procedures
- Local attractions and recommendations
- Special requests and room service

Maintain a warm, welcoming tone and ensure guest satisfaction.`,

      clinic: `You are a professional AI receptionist for ${tenantName}, a medical clinic. Help patients with:
- Appointment scheduling and availability
- Office hours and location information
- Insurance and payment inquiries
- General clinic services and specialties
- Emergency contact information

Always be respectful, empathetic, and maintain patient confidentiality. Never provide medical advice.`,

      dental: `You are a friendly AI receptionist for ${tenantName}, a dental practice. Assist patients with:
- Appointment scheduling and reminders
- Office hours and location
- Insurance and payment options
- Services offered (cleanings, procedures, etc.)
- Emergency dental care information

Be reassuring and professional, helping to ease any dental anxiety.`,

      retail_store: `You are a helpful AI assistant for ${tenantName}, a retail store. Help customers with:
- Product availability and inventory
- Store hours and location
- Product recommendations and information
- Order status and delivery
- Return and exchange policies

Be friendly, knowledgeable, and sales-focused while providing excellent customer service.`,

      salon: `You are a friendly AI receptionist for ${tenantName}, a beauty salon. Help clients with:
- Appointment booking and availability
- Service descriptions and pricing
- Stylist availability and preferences
- Product recommendations
- Special occasion bookings

Be warm, professional, and make clients feel valued.`,

      fitness: `You are an enthusiastic AI assistant for ${tenantName}, a fitness center. Help members with:
- Class schedules and registration
- Membership inquiries and plans
- Personal training availability
- Facility hours and amenities
- Trial membership information

Be motivating, positive, and supportive of fitness goals.`,

      other: `You are a professional AI assistant for ${tenantName}. Help customers with:
- General inquiries about services
- Appointment or reservation scheduling
- Business hours and location
- Product or service information
- Contact and support information

Always be helpful, professional, and customer-focused.`,
    };

    return prompts[businessType] || prompts.other;
  }

  /**
   * Get default voice ID based on language
   */
  private getDefaultVoiceId(language: string): string {
    const voiceMap: Record<string, string> = {
      'en-US': '11labs-Adrian',
      'en-GB': '11labs-Emily',
      'es-ES': '11labs-Mateo',
      'fr-FR': '11labs-Amelie',
      'de-DE': '11labs-Hans',
      'it-IT': '11labs-Alessandra',
      'pt-BR': '11labs-Ricardo',
      'ru-RU': 'openai-alloy',
      'az-AZ': 'openai-alloy',
    };

    return voiceMap[language] || '11labs-Adrian';
  }

  /**
   * Get begin message based on language
   */
  private getBeginMessage(tenantName: string, language: string): string {
    const messages: Record<string, string> = {
      'en-US': `Hello! Thank you for calling ${tenantName}. How may I assist you today?`,
      'az-AZ': `Salam! ${tenantName} şirkətinə zəng etdiyiniz üçün təşəkkür edirəm. Sizə necə kömək edə bilərəm?`,
      'es-ES': `¡Hola! Gracias por llamar a ${tenantName}. ¿Cómo puedo ayudarle hoy?`,
      'ru-RU': `Здравствуйте! Спасибо за звонок в ${tenantName}. Чем могу вам помочь?`,
    };

    return (
      messages[language] ||
      `Hello! Thank you for calling ${tenantName}. How may I assist you today?`
    );
  }

  /**
   * Get business-specific keywords for better recognition
   */
  private getBusinessKeywords(businessType: string): string[] {
    const keywords: Record<string, string[]> = {
      restaurant: [
        'reservation',
        'menu',
        'order',
        'delivery',
        'takeout',
        'table',
        'allergen',
      ],
      hotel: [
        'booking',
        'room',
        'check-in',
        'checkout',
        'amenities',
        'concierge',
      ],
      clinic: [
        'appointment',
        'doctor',
        'insurance',
        'symptoms',
        'prescription',
        'emergency',
      ],
      dental: [
        'appointment',
        'dentist',
        'cleaning',
        'filling',
        'extraction',
        'insurance',
      ],
      retail_store: [
        'product',
        'stock',
        'inventory',
        'price',
        'delivery',
        'return',
      ],
      salon: [
        'appointment',
        'haircut',
        'styling',
        'manicure',
        'pedicure',
        'treatment',
      ],
      fitness: [
        'membership',
        'class',
        'training',
        'workout',
        'schedule',
        'equipment',
      ],
    };

    return keywords[businessType] || [];
  }
}

export default new RetellProvisioningService();
