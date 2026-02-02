import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import retellProvisioningService from '../../services/retell-provisioning.service';

interface CreateAgentData {
  name?: string;
  systemPrompt?: string;
  voiceGender?: 'male' | 'female';
  voiceId?: string;
  language?: string;
  temperature?: number;
  enabledTools?: string[];
  phoneNumber?: string;
  retellAgentId?: string;
}

interface UpdateAgentData {
  name?: string;
  systemPrompt?: string;
  voiceGender?: 'male' | 'female';
  voiceId?: string;
  language?: string;
  temperature?: number;
  enabledTools?: string[];
  phoneNumber?: string;
  isActive?: boolean;
}

class AgentsService {

  /**
   * Get all agents for a tenant
   */
  async getAgentsByTenant(tenantId: string) {
    const agents = await prisma.agent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { calls: true },
        },
      },
    });

    return agents.map((agent) => {
      const effectiveGender = agent.voiceGender || 'male';
      const defaultVoiceId = effectiveGender === 'female' ? '11labs-Emily' : '11labs-Adrian';
      return {
        id: agent.id,
        tenantId: agent.tenantId,
        retellAgentId: agent.retellAgentId,
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        voiceGender: effectiveGender,
        voiceId: agent.voiceId || defaultVoiceId,
        language: agent.language,
        temperature: agent.temperature,
        enabledTools: agent.enabledTools || ['booking', 'ordering', 'faq', 'check_availability'],
        phoneNumber: agent.phoneNumber,
        isActive: agent.isActive,
        callCount: agent._count.calls,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      };
    });
  }

  /**
   * Get a single agent by ID (with tenant check)
   */
  async getAgent(agentId: string, tenantId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        _count: {
          select: { calls: true },
        },
      },
    });

    if (!agent) {
      throw new AppError('Agent not found', 404);
    }

    if (agent.tenantId !== tenantId) {
      throw new AppError('Agent not found', 404);
    }

    // Fetch live Retell details if available
    let retellDetails = null;
    if (agent.retellAgentId) {
      try {
        const retellAgent = await retellProvisioningService.getAgentDetails(agent.retellAgentId);
        retellDetails = {
          agentName: retellAgent.agent_name,
          voiceId: retellAgent.voice_id,
          language: retellAgent.language,
          lastModified: retellAgent.last_modification_timestamp,
        };
      } catch (error) {
        logger.warn('Failed to fetch Retell agent details', {
          agentId: agent.id,
          retellAgentId: agent.retellAgentId,
          error,
        });
      }
    }

    const effectiveGender = agent.voiceGender || 'male';
    const defaultVoiceId = effectiveGender === 'female' ? '11labs-Emily' : '11labs-Adrian';

    return {
      id: agent.id,
      tenantId: agent.tenantId,
      retellAgentId: agent.retellAgentId,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      voiceGender: effectiveGender,
      voiceId: agent.voiceId || defaultVoiceId,
      language: agent.language,
      temperature: agent.temperature,
      enabledTools: agent.enabledTools || ['booking', 'ordering', 'faq', 'check_availability'],
      phoneNumber: agent.phoneNumber,
      isActive: agent.isActive,
      callCount: agent._count.calls,
      retellDetails,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  /**
   * Create a new agent for a tenant
   */
  async createAgent(tenantId: string, data: CreateAgentData) {
    // Check tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: { agents: true },
        },
      },
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Check agent limit
    const maxAgents = tenant.subscription?.plan?.maxAgents ?? 1;
    if (tenant._count.agents >= maxAgents) {
      throw new AppError(
        `Agent limit reached. Your plan allows ${maxAgents} agent(s). Upgrade your plan for more.`,
        403
      );
    }

    // Validate inputs
    this.validateAgentData(data);

    // Create agent in database
    const agent = await prisma.agent.create({
      data: {
        tenantId,
        retellAgentId: data.retellAgentId || null,
        name: data.name || `${tenant.name} AI Agent`,
        systemPrompt: data.systemPrompt || null,
        voiceGender: data.voiceGender || 'male',
        voiceId: data.voiceId || null,
        language: data.language || 'en-US',
        temperature: data.temperature ?? 0.7,
        enabledTools: data.enabledTools || ['booking', 'ordering', 'faq', 'check_availability'],
        phoneNumber: data.phoneNumber || null,
      },
    });

    // If no retellAgentId provided, auto-provision on Retell
    if (!data.retellAgentId) {
      try {
        const retellAgentId = await retellProvisioningService.createAgentForTenant({
          tenantId,
          tenantName: agent.name || tenant.name,
          businessType: tenant.businessType,
          language: data.language || 'en-US',
          voiceId: data.voiceId,
        });

        await prisma.agent.update({
          where: { id: agent.id },
          data: { retellAgentId },
        });

        logger.info('Retell agent provisioned for new agent', {
          agentId: agent.id,
          retellAgentId,
        });

        agent.retellAgentId = retellAgentId;
      } catch (error) {
        logger.error('Failed to provision Retell agent', {
          error,
          agentId: agent.id,
        });
        // Don't fail - agent is saved in DB
      }
    }

    logger.info('Agent created', { agentId: agent.id, tenantId });

    return agent;
  }

  /**
   * Update an agent
   */
  async updateAgent(agentId: string, tenantId: string, data: UpdateAgentData) {
    // Check agent exists and belongs to tenant
    const existing = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new AppError('Agent not found', 404);
    }

    // Validate inputs
    this.validateAgentData(data);

    // Update in database
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        systemPrompt: data.systemPrompt !== undefined ? data.systemPrompt : undefined,
        voiceGender: data.voiceGender !== undefined ? data.voiceGender : undefined,
        voiceId: data.voiceId !== undefined ? data.voiceId : undefined,
        language: data.language !== undefined ? data.language : undefined,
        temperature: data.temperature !== undefined ? data.temperature : undefined,
        enabledTools: data.enabledTools !== undefined ? data.enabledTools as any : undefined,
        phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    // Sync to Retell if agent has retellAgentId
    if (agent.retellAgentId) {
      try {
        await this.syncAgentToRetell(agent);
      } catch (error) {
        logger.error('Failed to sync agent config to Retell', {
          error,
          agentId: agent.id,
        });
        // Don't fail the request
      }
    }

    logger.info('Agent updated', { agentId, tenantId });

    return agent;
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string, tenantId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.tenantId !== tenantId) {
      throw new AppError('Agent not found', 404);
    }

    // Delete from Retell if exists
    if (agent.retellAgentId) {
      try {
        await retellProvisioningService.deleteAgent(agent.retellAgentId);
        logger.info('Retell agent deleted', {
          agentId: agent.id,
          retellAgentId: agent.retellAgentId,
        });
      } catch (error) {
        logger.error('Failed to delete Retell agent', {
          error,
          agentId: agent.id,
          retellAgentId: agent.retellAgentId,
        });
        // Continue with local deletion
      }
    }

    await prisma.agent.delete({
      where: { id: agentId },
    });

    logger.info('Agent deleted', { agentId, tenantId });
  }

  /**
   * Link an existing Retell agent to a local agent record
   */
  async linkRetellAgent(agentId: string, tenantId: string, retellAgentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.tenantId !== tenantId) {
      throw new AppError('Agent not found', 404);
    }

    // Verify the Retell agent exists
    try {
      await retellProvisioningService.getAgentDetails(retellAgentId);
    } catch (error) {
      throw new AppError('Retell agent not found. Check the agent ID.', 400);
    }

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { retellAgentId },
    });

    logger.info('Retell agent linked', { agentId, retellAgentId, tenantId });

    return updated;
  }

  /**
   * Get agent config options (voices, tools, etc.)
   */
  getConfigOptions() {
    return {
      voices: this.getVoiceOptions(),
      tools: this.getAvailableTools(),
      languages: this.getLanguageOptions(),
      temperatureRange: { min: 0.0, max: 1.0, step: 0.1 },
    };
  }

  private getLanguageOptions() {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Spanish' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'ru-RU', name: 'Russian' },
      { code: 'az-AZ', name: 'Azerbaijani' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'ar-SA', name: 'Arabic' },
      { code: 'tr-TR', name: 'Turkish' },
      { code: 'hi-IN', name: 'Hindi' },
    ];
  }

  /**
   * Sync agent config to Retell AI
   */
  private async syncAgentToRetell(agent: any) {
    if (!agent.retellAgentId) return;

    const updateData: any = {};

    if (agent.name) {
      updateData.agent_name = agent.name;
    }

    if (agent.systemPrompt) {
      updateData.general_prompt = agent.systemPrompt;
    }

    if (agent.voiceId) {
      updateData.voice_id = agent.voiceId;
    } else if (agent.voiceGender) {
      updateData.voice_id = agent.voiceGender === 'female'
        ? '11labs-Emily'
        : '11labs-Adrian';
    }

    if (agent.temperature !== null && agent.temperature !== undefined) {
      updateData.temperature = agent.temperature;
    }

    if (agent.language) {
      updateData.language = agent.language;
    }

    if (agent.enabledTools) {
      const enabledTools = agent.enabledTools as string[];
      updateData.general_tools = this.buildToolsConfig(agent.tenantId, enabledTools);
    }

    await retellProvisioningService.updateAgent(agent.retellAgentId, updateData);
  }

  /**
   * Validate agent input data
   */
  private validateAgentData(data: Partial<CreateAgentData & UpdateAgentData>) {
    if (data.temperature !== undefined) {
      if (data.temperature < 0.0 || data.temperature > 1.0) {
        throw new AppError('Temperature must be between 0.0 and 1.0', 400);
      }
    }

    if (data.voiceGender && !['male', 'female'].includes(data.voiceGender)) {
      throw new AppError('Voice gender must be "male" or "female"', 400);
    }

    const availableTools = ['booking', 'ordering', 'faq', 'check_availability', 'end_call'];
    if (data.enabledTools) {
      const invalidTools = data.enabledTools.filter(tool => !availableTools.includes(tool));
      if (invalidTools.length > 0) {
        throw new AppError(`Invalid tools: ${invalidTools.join(', ')}`, 400);
      }
    }
  }

  /**
   * Build tools configuration for Retell
   */
  private buildToolsConfig(tenantId: string, enabledTools: string[]) {
    const allTools = [
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
    ];

    const toolNameMap: Record<string, string> = {
      'booking': 'book_appointment',
      'ordering': 'create_order',
      'faq': 'answer_faq',
      'check_availability': 'check_availability',
      'end_call': 'end_call',
    };

    const mappedToolNames = enabledTools.map(tool => toolNameMap[tool] || tool);
    return allTools.filter(tool => mappedToolNames.includes(tool.name));
  }

  private getVoiceOptions() {
    return {
      male: [
        { id: '11labs-Adrian', name: 'Adrian (English)', language: 'en-US', provider: '11labs' },
        { id: '11labs-Mateo', name: 'Mateo (Spanish)', language: 'es-ES', provider: '11labs' },
        { id: '11labs-Hans', name: 'Hans (German)', language: 'de-DE', provider: '11labs' },
        { id: '11labs-Ricardo', name: 'Ricardo (Portuguese)', language: 'pt-BR', provider: '11labs' },
        { id: 'openai-alloy', name: 'Alloy (Multi-language)', language: 'multi', provider: 'openai' },
      ],
      female: [
        { id: '11labs-Emily', name: 'Emily (English)', language: 'en-GB', provider: '11labs' },
        { id: '11labs-Amelie', name: 'Amelie (French)', language: 'fr-FR', provider: '11labs' },
        { id: '11labs-Alessandra', name: 'Alessandra (Italian)', language: 'it-IT', provider: '11labs' },
        { id: 'openai-nova', name: 'Nova (Multi-language)', language: 'multi', provider: 'openai' },
      ],
    };
  }

  private getAvailableTools() {
    return [
      {
        id: 'booking',
        name: 'Booking & Appointments',
        description: 'Allow customers to book appointments or reservations',
        icon: '📅',
      },
      {
        id: 'ordering',
        name: 'Order Placement',
        description: 'Enable customers to place orders for products or services',
        icon: '🛒',
      },
      {
        id: 'faq',
        name: 'FAQ Answers',
        description: 'Answer frequently asked questions about your business',
        icon: '❓',
      },
      {
        id: 'check_availability',
        name: 'Check Availability',
        description: 'Check availability of services, products, or time slots',
        icon: '✅',
      },
    ];
  }

  /**
   * Assign a phone number to an agent
   */
  async assignPhoneNumber(
    agentId: string,
    tenantId: string,
    phoneNumber: string
  ) {
    // Check agent exists and belongs to tenant
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.tenantId !== tenantId) {
      throw new AppError('Agent not found', 404);
    }

    // Check if phone number is already assigned to another agent
    const existingAgent = await prisma.agent.findFirst({
      where: {
        phoneNumber,
        tenantId,
        id: { not: agentId },
      },
    });

    if (existingAgent) {
      throw new AppError(
        `Phone number is already assigned to agent: ${existingAgent.name}`,
        400
      );
    }

    // Update agent with phone number
    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { phoneNumber },
    });

    logger.info('Phone number assigned to agent', {
      agentId,
      phoneNumber,
      tenantId,
    });

    return updated;
  }

  /**
   * Remove phone number from an agent
   */
  async unassignPhoneNumber(agentId: string, tenantId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.tenantId !== tenantId) {
      throw new AppError('Agent not found', 404);
    }

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { phoneNumber: null },
    });

    logger.info('Phone number unassigned from agent', {
      agentId,
      tenantId,
    });

    return updated;
  }

  /**
   * Get available phone numbers for tenant (including provisioned and unassigned)
   */
  async getAvailablePhoneNumbers(tenantId: string) {
    // Get tenant's main Twilio number
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { twilioNumber: true },
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Get all agents with their phone numbers
    const agents = await prisma.agent.findMany({
      where: { tenantId },
      select: { id: true, name: true, phoneNumber: true },
    });

    const assignedNumbers = agents
      .filter((a) => a.phoneNumber)
      .map((a) => ({
        phoneNumber: a.phoneNumber!,
        assignedTo: { agentId: a.id, agentName: a.name },
      }));

    const availableNumbers: { phoneNumber: string; source: string }[] = [];

    // Add tenant's main number if not assigned
    if (tenant.twilioNumber) {
      const isAssigned = assignedNumbers.some(
        (n) => n.phoneNumber === tenant.twilioNumber
      );
      if (!isAssigned) {
        availableNumbers.push({
          phoneNumber: tenant.twilioNumber,
          source: 'tenant',
        });
      }
    }

    return {
      available: availableNumbers,
      assigned: assignedNumbers,
      tenantNumber: tenant.twilioNumber,
    };
  }

  /**
   * Get agent by phone number (used for incoming calls)
   */
  async getAgentByPhoneNumber(phoneNumber: string) {
    // First try to find agent with this specific phone
    const agent = await prisma.agent.findFirst({
      where: {
        phoneNumber,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            businessType: true,
            twilioNumber: true,
          },
        },
      },
    });

    if (agent) {
      return agent;
    }

    // If no agent has this number, find tenant by their main Twilio number
    // and return their first active agent
    const tenant = await prisma.tenant.findFirst({
      where: { twilioNumber: phoneNumber },
      include: {
        agents: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (tenant && tenant.agents.length > 0) {
      return {
        ...tenant.agents[0],
        tenant: {
          id: tenant.id,
          name: tenant.name,
          businessType: tenant.businessType,
          twilioNumber: tenant.twilioNumber,
        },
      };
    }

    return null;
  }
}

export default new AgentsService();
