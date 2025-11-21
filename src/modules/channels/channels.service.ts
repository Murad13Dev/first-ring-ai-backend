import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import twilio from 'twilio';
import QRCode from 'qrcode';
import { randomUUID } from 'crypto';

// Types
interface WhatsAppMessage {
  to: string;
  message: string;
  mediaUrl?: string;
}

interface WebChatMessage {
  sessionId: string;
  message: string;
  sender: 'user' | 'agent';
  metadata?: any;
}

interface QROrderConfig {
  tenantId: string;
  tableNumber?: string;
  locationId?: string;
  menuUrl?: string;
}

// WhatsApp Service (via Twilio)
class WhatsAppService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(data: WhatsAppMessage) {
    try {
      const messageOptions: any = {
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${data.to}`,
        body: data.message,
      };

      if (data.mediaUrl) {
        messageOptions.mediaUrl = [data.mediaUrl];
      }

      const result = await this.client.messages.create(messageOptions);

      logger.info('WhatsApp message sent', {
        to: data.to,
        sid: result.sid,
      });

      return {
        messageId: result.sid,
        status: result.status,
      };
    } catch (error: any) {
      logger.error('WhatsApp send error', { error: error.message });
      throw new AppError('Failed to send WhatsApp message', 500);
    }
  }

  /**
   * Send template message (for business-initiated conversations)
   */
  async sendTemplateMessage(to: string, templateSid: string, variables: Record<string, string>) {
    try {
      const result = await this.client.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${to}`,
        contentSid: templateSid,
        contentVariables: JSON.stringify(variables),
      });

      return {
        messageId: result.sid,
        status: result.status,
      };
    } catch (error: any) {
      logger.error('WhatsApp template send error', { error: error.message });
      throw new AppError('Failed to send WhatsApp template', 500);
    }
  }

  /**
   * Handle incoming WhatsApp webhook
   */
  async handleIncoming(body: any) {
    const from = body.From?.replace('whatsapp:', '');
    const message = body.Body;
    const mediaUrl = body.MediaUrl0;

    logger.info('WhatsApp message received', { from, message });

    // Store message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        channel: 'whatsapp',
        sessionId: from,
        sender: 'user',
        message,
        mediaUrl,
        metadata: body,
      },
    });

    return chatMessage;
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(to: string, order: any) {
    const itemsList = order.items
      .map((item: any) => `- ${item.name} x${item.quantity}: $${item.price}`)
      .join('\n');

    const message = `🛍️ *Order Confirmed*\n\nOrder #${order.id.slice(-6)}\n\n${itemsList}\n\n*Total: $${order.total.toFixed(2)}*\n\nThank you for your order!`;

    return this.sendMessage({ to, message });
  }

  /**
   * Send booking confirmation via WhatsApp
   */
  async sendBookingConfirmation(to: string, booking: any) {
    const dateStr = new Date(booking.dateTime).toLocaleString();
    const message = `📅 *Booking Confirmed*\n\nDate: ${dateStr}\nService: ${booking.serviceName || 'Appointment'}\nParty Size: ${booking.partySize || 1}\n\nSee you soon!`;

    return this.sendMessage({ to, message });
  }
}

// Web Chat Service
class WebChatService {
  /**
   * Create new chat session
   */
  async createSession(tenantId: string, customerInfo?: any) {
    const sessionId = randomUUID();

    const session = await prisma.chatSession.create({
      data: {
        id: sessionId,
        tenantId,
        channel: 'webchat',
        customerPhone: customerInfo?.phone,
        customerEmail: customerInfo?.email,
        customerName: customerInfo?.name,
        status: 'active',
        metadata: customerInfo,
      },
    });

    logger.info('Web chat session created', { sessionId, tenantId });
    return session;
  }

  /**
   * Store chat message
   */
  async storeMessage(data: WebChatMessage) {
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        channel: 'webchat',
        sender: data.sender,
        message: data.message,
        metadata: data.metadata,
      },
    });

    return message;
  }

  /**
   * Get chat history for session
   */
  async getSessionHistory(sessionId: string) {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  }

  /**
   * End chat session
   */
  async endSession(sessionId: string) {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });

    logger.info('Web chat session ended', { sessionId });
  }

  /**
   * Get active sessions for tenant
   */
  async getActiveSessions(tenantId: string) {
    const sessions = await prisma.chatSession.findMany({
      where: {
        tenantId,
        status: 'active',
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  }

  /**
   * Transfer to human agent
   */
  async transferToAgent(sessionId: string, agentId?: string) {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'transferred',
        assignedAgentId: agentId,
        transferredAt: new Date(),
      },
    });

    logger.info('Chat transferred to agent', { sessionId, agentId });
  }
}

// QR Ordering Service
class QROrderingService {
  /**
   * Generate QR code for ordering
   */
  async generateQRCode(config: QROrderConfig) {
    const qrId = randomUUID();

    // Build ordering URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const orderUrl = new URL(`${baseUrl}/order`);
    orderUrl.searchParams.set('tenant', config.tenantId);
    orderUrl.searchParams.set('qr', qrId);

    if (config.tableNumber) {
      orderUrl.searchParams.set('table', config.tableNumber);
    }
    if (config.locationId) {
      orderUrl.searchParams.set('location', config.locationId);
    }

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(orderUrl.toString(), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Store QR code record
    const qrRecord = await prisma.qRCode.create({
      data: {
        id: qrId,
        tenantId: config.tenantId,
        tableNumber: config.tableNumber,
        locationId: config.locationId,
        url: orderUrl.toString(),
        status: 'active',
      },
    });

    logger.info('QR code generated', { qrId, tenantId: config.tenantId });

    return {
      qrId,
      qrDataUrl,
      orderUrl: orderUrl.toString(),
    };
  }

  /**
   * Generate QR code as buffer (for printing)
   */
  async generateQRCodeBuffer(config: QROrderConfig) {
    const qrId = randomUUID();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const orderUrl = new URL(`${baseUrl}/order`);
    orderUrl.searchParams.set('tenant', config.tenantId);
    orderUrl.searchParams.set('qr', qrId);

    if (config.tableNumber) {
      orderUrl.searchParams.set('table', config.tableNumber);
    }

    const buffer = await QRCode.toBuffer(orderUrl.toString(), {
      width: 600,
      margin: 4,
    });

    // Store record
    await prisma.qRCode.create({
      data: {
        id: qrId,
        tenantId: config.tenantId,
        tableNumber: config.tableNumber,
        locationId: config.locationId,
        url: orderUrl.toString(),
        status: 'active',
      },
    });

    return {
      qrId,
      buffer,
      contentType: 'image/png',
    };
  }

  /**
   * Validate QR code and get tenant info
   */
  async validateQRCode(qrId: string) {
    const qrCode = await prisma.qRCode.findUnique({
      where: { id: qrId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            businessType: true,
            settings: true,
          },
        },
      },
    });

    if (!qrCode) {
      throw new AppError('Invalid QR code', 404);
    }

    if (qrCode.status !== 'active') {
      throw new AppError('QR code is no longer active', 400);
    }

    // Track scan
    await prisma.qRCode.update({
      where: { id: qrId },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: new Date(),
      },
    });

    return {
      tenant: qrCode.tenant,
      tableNumber: qrCode.tableNumber,
      locationId: qrCode.locationId,
    };
  }

  /**
   * Get all QR codes for tenant
   */
  async getTenantQRCodes(tenantId: string) {
    const qrCodes = await prisma.qRCode.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return qrCodes;
  }

  /**
   * Deactivate QR code
   */
  async deactivateQRCode(qrId: string) {
    await prisma.qRCode.update({
      where: { id: qrId },
      data: { status: 'inactive' },
    });

    logger.info('QR code deactivated', { qrId });
  }

  /**
   * Generate bulk QR codes for tables
   */
  async generateBulkQRCodes(tenantId: string, tableCount: number) {
    const results = [];

    for (let i = 1; i <= tableCount; i++) {
      const qr = await this.generateQRCode({
        tenantId,
        tableNumber: i.toString(),
      });
      results.push(qr);
    }

    logger.info('Bulk QR codes generated', { tenantId, count: tableCount });
    return results;
  }
}

// Main Channels Service
export class ChannelsService {
  public whatsapp: WhatsAppService;
  public webchat: WebChatService;
  public qrOrdering: QROrderingService;

  constructor() {
    this.whatsapp = new WhatsAppService();
    this.webchat = new WebChatService();
    this.qrOrdering = new QROrderingService();
  }

  /**
   * Get channel statistics for tenant
   */
  async getChannelStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [whatsappMessages, webChatSessions, qrScans] = await Promise.all([
      prisma.chatMessage.count({
        where: { ...where, channel: 'whatsapp' },
      }),
      prisma.chatSession.count({
        where: { ...where, channel: 'webchat' },
      }),
      prisma.qRCode.aggregate({
        where: { tenantId },
        _sum: { scanCount: true },
      }),
    ]);

    return {
      whatsapp: { messages: whatsappMessages },
      webchat: { sessions: webChatSessions },
      qrOrdering: { scans: qrScans._sum.scanCount || 0 },
    };
  }
}

export default new ChannelsService();
