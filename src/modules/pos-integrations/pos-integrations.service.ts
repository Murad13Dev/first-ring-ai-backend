import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import axios, { AxiosInstance } from 'axios';

// POS Provider Types
export type POSProvider =
  | 'toast'
  | 'clover'
  | 'lightspeed'
  | 'shopify'
  | 'square'
  | 'vagaro'
  | 'mindbody'
  | 'boulevard';

interface POSConfig {
  provider: POSProvider;
  apiKey: string;
  apiSecret?: string;
  merchantId?: string;
  locationId?: string;
  environment: 'sandbox' | 'production';
}

interface POSOrder {
  externalId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    modifiers?: any[];
  }>;
  total: number;
  tax: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
}

interface POSAppointment {
  externalId: string;
  serviceId: string;
  staffId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

// Base POS Adapter Interface
interface POSAdapter {
  createOrder(order: POSOrder): Promise<{ externalOrderId: string; status: string }>;
  getOrder(orderId: string): Promise<any>;
  cancelOrder(orderId: string): Promise<boolean>;
  syncMenu(): Promise<any[]>;
  createAppointment?(appointment: POSAppointment): Promise<{ externalAppointmentId: string }>;
  getAvailability?(date: Date, serviceId?: string): Promise<any[]>;
}

// Toast POS Adapter
class ToastAdapter implements POSAdapter {
  private client: AxiosInstance;
  private config: POSConfig;

  constructor(config: POSConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.environment === 'production'
        ? 'https://api.toasttab.com'
        : 'https://api.sandbox.toasttab.com',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Toast-Restaurant-External-ID': config.merchantId,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrder(order: POSOrder) {
    try {
      const response = await this.client.post('/orders/v2/orders', {
        entityType: 'Order',
        externalId: order.externalId,
        source: 'First Ring AI',
        checks: [{
          entityType: 'Check',
          selections: order.items.map(item => ({
            entityType: 'OrderSelection',
            itemGroup: { guid: item.name },
            quantity: item.quantity,
            price: item.price,
            modifiers: item.modifiers || [],
          })),
          customer: {
            firstName: order.customerName?.split(' ')[0],
            lastName: order.customerName?.split(' ').slice(1).join(' '),
            phone: order.customerPhone,
            email: order.customerEmail,
          },
        }],
      });

      return {
        externalOrderId: response.data.guid,
        status: response.data.approvalStatus,
      };
    } catch (error: any) {
      logger.error('Toast createOrder error', { error: error.message });
      throw new AppError('Failed to create Toast order', 500);
    }
  }

  async getOrder(orderId: string) {
    const response = await this.client.get(`/orders/v2/orders/${orderId}`);
    return response.data;
  }

  async cancelOrder(orderId: string) {
    await this.client.post(`/orders/v2/orders/${orderId}/void`);
    return true;
  }

  async syncMenu() {
    const response = await this.client.get('/menus/v2/menus');
    return response.data.menus || [];
  }
}

// Clover POS Adapter
class CloverAdapter implements POSAdapter {
  private client: AxiosInstance;
  private config: POSConfig;

  constructor(config: POSConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.environment === 'production'
        ? `https://api.clover.com/v3/merchants/${config.merchantId}`
        : `https://sandbox.dev.clover.com/v3/merchants/${config.merchantId}`,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrder(order: POSOrder) {
    try {
      const response = await this.client.post('/orders', {
        state: 'open',
        total: Math.round(order.total * 100),
        note: order.notes,
        lineItems: order.items.map(item => ({
          name: item.name,
          price: Math.round(item.price * 100),
          unitQty: item.quantity * 1000,
        })),
      });

      return {
        externalOrderId: response.data.id,
        status: response.data.state,
      };
    } catch (error: any) {
      logger.error('Clover createOrder error', { error: error.message });
      throw new AppError('Failed to create Clover order', 500);
    }
  }

  async getOrder(orderId: string) {
    const response = await this.client.get(`/orders/${orderId}`);
    return response.data;
  }

  async cancelOrder(orderId: string) {
    await this.client.post(`/orders/${orderId}`, { state: 'canceled' });
    return true;
  }

  async syncMenu() {
    const response = await this.client.get('/items');
    return response.data.elements || [];
  }
}

// Lightspeed POS Adapter
class LightspeedAdapter implements POSAdapter {
  private client: AxiosInstance;
  private config: POSConfig;

  constructor(config: POSConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.lightspeedapp.com/API/Account',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrder(order: POSOrder) {
    try {
      const response = await this.client.post(`/${this.config.merchantId}/Sale.json`, {
        Sale: {
          completed: false,
          shopID: this.config.locationId,
          SaleLines: {
            SaleLine: order.items.map(item => ({
              itemID: item.name,
              unitQuantity: item.quantity,
              unitPrice: item.price,
            })),
          },
          Customer: {
            firstName: order.customerName?.split(' ')[0],
            lastName: order.customerName?.split(' ').slice(1).join(' '),
            Phones: { Phone: { number: order.customerPhone } },
            Emails: { Email: { address: order.customerEmail } },
          },
        },
      });

      return {
        externalOrderId: response.data.Sale.saleID,
        status: response.data.Sale.completed ? 'completed' : 'pending',
      };
    } catch (error: any) {
      logger.error('Lightspeed createOrder error', { error: error.message });
      throw new AppError('Failed to create Lightspeed order', 500);
    }
  }

  async getOrder(orderId: string) {
    const response = await this.client.get(`/${this.config.merchantId}/Sale/${orderId}.json`);
    return response.data.Sale;
  }

  async cancelOrder(orderId: string) {
    await this.client.put(`/${this.config.merchantId}/Sale/${orderId}.json`, {
      Sale: { completed: true, voided: true },
    });
    return true;
  }

  async syncMenu() {
    const response = await this.client.get(`/${this.config.merchantId}/Item.json`);
    return response.data.Item || [];
  }
}

// Shopify POS Adapter
class ShopifyAdapter implements POSAdapter {
  private client: AxiosInstance;
  private config: POSConfig;

  constructor(config: POSConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `https://${config.merchantId}.myshopify.com/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrder(order: POSOrder) {
    try {
      const response = await this.client.post('/orders.json', {
        order: {
          line_items: order.items.map(item => ({
            title: item.name,
            quantity: item.quantity,
            price: item.price.toString(),
          })),
          customer: {
            first_name: order.customerName?.split(' ')[0],
            last_name: order.customerName?.split(' ').slice(1).join(' '),
            phone: order.customerPhone,
            email: order.customerEmail,
          },
          note: order.notes,
          financial_status: 'pending',
          source_name: 'First Ring AI',
        },
      });

      return {
        externalOrderId: response.data.order.id.toString(),
        status: response.data.order.financial_status,
      };
    } catch (error: any) {
      logger.error('Shopify createOrder error', { error: error.message });
      throw new AppError('Failed to create Shopify order', 500);
    }
  }

  async getOrder(orderId: string) {
    const response = await this.client.get(`/orders/${orderId}.json`);
    return response.data.order;
  }

  async cancelOrder(orderId: string) {
    await this.client.post(`/orders/${orderId}/cancel.json`);
    return true;
  }

  async syncMenu() {
    const response = await this.client.get('/products.json');
    return response.data.products || [];
  }
}

// Vagaro Adapter (Salon/Spa)
class VagaroAdapter implements POSAdapter {
  private client: AxiosInstance;
  private config: POSConfig;

  constructor(config: POSConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.vagaro.com/api/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrder(order: POSOrder) {
    try {
      const response = await this.client.post('/sales', {
        businessId: this.config.merchantId,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        customer: {
          name: order.customerName,
          phone: order.customerPhone,
          email: order.customerEmail,
        },
      });

      return {
        externalOrderId: response.data.saleId,
        status: response.data.status,
      };
    } catch (error: any) {
      logger.error('Vagaro createOrder error', { error: error.message });
      throw new AppError('Failed to create Vagaro order', 500);
    }
  }

  async getOrder(orderId: string) {
    const response = await this.client.get(`/sales/${orderId}`);
    return response.data;
  }

  async cancelOrder(orderId: string) {
    await this.client.delete(`/sales/${orderId}`);
    return true;
  }

  async syncMenu() {
    const response = await this.client.get(`/businesses/${this.config.merchantId}/services`);
    return response.data.services || [];
  }

  async createAppointment(appointment: POSAppointment) {
    const response = await this.client.post('/appointments', {
      businessId: this.config.merchantId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      customer: {
        name: appointment.customerName,
        phone: appointment.customerPhone,
        email: appointment.customerEmail,
      },
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      notes: appointment.notes,
    });

    return { externalAppointmentId: response.data.appointmentId };
  }

  async getAvailability(date: Date, serviceId?: string) {
    const response = await this.client.get(`/businesses/${this.config.merchantId}/availability`, {
      params: { date: date.toISOString().split('T')[0], serviceId },
    });
    return response.data.slots || [];
  }
}

// Mindbody Adapter (Fitness/Wellness)
class MindbodyAdapter implements POSAdapter {
  private client: AxiosInstance;
  private config: POSConfig;

  constructor(config: POSConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.mindbodyonline.com/public/v6',
      headers: {
        'Api-Key': config.apiKey,
        'SiteId': config.merchantId,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrder(order: POSOrder) {
    try {
      const response = await this.client.post('/sale/checkoutshoppingcart', {
        CartItems: order.items.map(item => ({
          Item: { Id: item.name },
          Quantity: item.quantity,
        })),
        ClientId: order.customerPhone,
        Test: this.config.environment === 'sandbox',
      });

      return {
        externalOrderId: response.data.SaleId.toString(),
        status: response.data.Status,
      };
    } catch (error: any) {
      logger.error('Mindbody createOrder error', { error: error.message });
      throw new AppError('Failed to create Mindbody order', 500);
    }
  }

  async getOrder(orderId: string) {
    const response = await this.client.get('/sale/sales', {
      params: { saleId: orderId },
    });
    return response.data.Sales?.[0];
  }

  async cancelOrder(orderId: string) {
    // Mindbody uses returns for cancellation
    await this.client.post('/sale/returnsale', { SaleId: orderId });
    return true;
  }

  async syncMenu() {
    const response = await this.client.get('/sale/products');
    return response.data.Products || [];
  }

  async createAppointment(appointment: POSAppointment) {
    const response = await this.client.post('/appointment/addappointment', {
      SessionTypeId: appointment.serviceId,
      StaffId: appointment.staffId,
      ClientId: appointment.customerPhone,
      StartDateTime: appointment.startTime.toISOString(),
      EndDateTime: appointment.endTime.toISOString(),
      Notes: appointment.notes,
    });

    return { externalAppointmentId: response.data.Appointment.Id.toString() };
  }

  async getAvailability(date: Date, serviceId?: string) {
    const response = await this.client.get('/appointment/bookableitems', {
      params: {
        StartDate: date.toISOString().split('T')[0],
        EndDate: date.toISOString().split('T')[0],
        SessionTypeIds: serviceId ? [serviceId] : undefined,
      },
    });
    return response.data.AvailableItems || [];
  }
}

// Boulevard Adapter (Salon/Spa)
class BoulevardAdapter implements POSAdapter {
  private client: AxiosInstance;
  private config: POSConfig;

  constructor(config: POSConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.boulevard.io/v1',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrder(order: POSOrder) {
    try {
      const response = await this.client.post(`/businesses/${this.config.merchantId}/orders`, {
        lineItems: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: { amount: Math.round(item.price * 100), currency: 'USD' },
        })),
        client: {
          name: order.customerName,
          mobilePhone: order.customerPhone,
          email: order.customerEmail,
        },
        note: order.notes,
      });

      return {
        externalOrderId: response.data.id,
        status: response.data.state,
      };
    } catch (error: any) {
      logger.error('Boulevard createOrder error', { error: error.message });
      throw new AppError('Failed to create Boulevard order', 500);
    }
  }

  async getOrder(orderId: string) {
    const response = await this.client.get(`/businesses/${this.config.merchantId}/orders/${orderId}`);
    return response.data;
  }

  async cancelOrder(orderId: string) {
    await this.client.post(`/businesses/${this.config.merchantId}/orders/${orderId}/cancel`);
    return true;
  }

  async syncMenu() {
    const response = await this.client.get(`/businesses/${this.config.merchantId}/services`);
    return response.data.data || [];
  }

  async createAppointment(appointment: POSAppointment) {
    const response = await this.client.post(`/businesses/${this.config.merchantId}/appointments`, {
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      client: {
        name: appointment.customerName,
        mobilePhone: appointment.customerPhone,
        email: appointment.customerEmail,
      },
      startAt: appointment.startTime.toISOString(),
      notes: appointment.notes,
    });

    return { externalAppointmentId: response.data.id };
  }

  async getAvailability(date: Date, serviceId?: string) {
    const response = await this.client.get(`/businesses/${this.config.merchantId}/availability`, {
      params: {
        date: date.toISOString().split('T')[0],
        serviceId,
      },
    });
    return response.data.availableTimes || [];
  }
}

// Main POS Integration Service
export class POSIntegrationsService {
  private adapters: Map<string, POSAdapter> = new Map();

  /**
   * Get or create adapter for tenant
   */
  private async getAdapter(tenantId: string): Promise<POSAdapter> {
    if (this.adapters.has(tenantId)) {
      return this.adapters.get(tenantId)!;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    const posConfig = tenant.posConfig as unknown as POSConfig;
    if (!posConfig || !posConfig.provider) {
      throw new AppError('POS not configured for this tenant', 400);
    }

    const adapter = this.createAdapter(posConfig);
    this.adapters.set(tenantId, adapter);
    return adapter;
  }

  /**
   * Create adapter based on provider
   */
  private createAdapter(config: POSConfig): POSAdapter {
    switch (config.provider) {
      case 'toast':
        return new ToastAdapter(config);
      case 'clover':
        return new CloverAdapter(config);
      case 'lightspeed':
        return new LightspeedAdapter(config);
      case 'shopify':
        return new ShopifyAdapter(config);
      case 'vagaro':
        return new VagaroAdapter(config);
      case 'mindbody':
        return new MindbodyAdapter(config);
      case 'boulevard':
        return new BoulevardAdapter(config);
      default:
        throw new AppError(`Unsupported POS provider: ${config.provider}`, 400);
    }
  }

  /**
   * Configure POS for tenant
   */
  async configurePOS(tenantId: string, config: POSConfig) {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        posConfig: config as any,
      },
    });

    // Clear cached adapter
    this.adapters.delete(tenantId);

    logger.info('POS configured', { tenantId, provider: config.provider });
    return tenant;
  }

  /**
   * Get POS configuration
   */
  async getPOSConfig(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { posConfig: true },
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    return tenant.posConfig;
  }

  /**
   * Test POS connection
   */
  async testConnection(tenantId: string) {
    try {
      const adapter = await this.getAdapter(tenantId);
      await adapter.syncMenu();
      return { success: true, message: 'POS connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Push order to POS
   */
  async pushOrder(tenantId: string, orderId: string) {
    const adapter = await this.getAdapter(tenantId);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const posOrder: POSOrder = {
      externalId: order.id,
      items: (order.items as any[]).map(item => ({
        name: item.serviceId || item.name,
        quantity: item.quantity,
        price: item.price,
        modifiers: item.modifiers,
      })),
      total: order.total,
      tax: order.tax,
      customerName: order.customerName || undefined,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      notes: order.notes || undefined,
    };

    const result = await adapter.createOrder(posOrder);

    // Update order with external ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        externalOrderId: result.externalOrderId,
        posStatus: result.status,
      },
    });

    logger.info('Order pushed to POS', {
      orderId,
      tenantId,
      externalOrderId: result.externalOrderId,
    });

    return result;
  }

  /**
   * Push appointment to POS (for spa/salon systems)
   */
  async pushAppointment(tenantId: string, bookingId: string) {
    const adapter = await this.getAdapter(tenantId);

    if (!adapter.createAppointment) {
      throw new AppError('POS does not support appointments', 400);
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    const appointment: POSAppointment = {
      externalId: booking.id,
      serviceId: booking.serviceId || '',
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail || undefined,
      startTime: booking.dateTime,
      endTime: new Date(booking.dateTime.getTime() + (booking.duration || 60) * 60000),
      notes: booking.notes || undefined,
    };

    const result = await adapter.createAppointment(appointment);

    // Update booking with external ID
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        externalBookingId: result.externalAppointmentId,
      },
    });

    logger.info('Appointment pushed to POS', {
      bookingId,
      tenantId,
      externalAppointmentId: result.externalAppointmentId,
    });

    return result;
  }

  /**
   * Sync menu from POS
   */
  async syncMenu(tenantId: string) {
    const adapter = await this.getAdapter(tenantId);
    const menuItems = await adapter.syncMenu();

    logger.info('Menu synced from POS', {
      tenantId,
      itemCount: menuItems.length,
    });

    return menuItems;
  }

  /**
   * Get availability from POS (for spa/salon systems)
   */
  async getAvailability(tenantId: string, date: Date, serviceId?: string) {
    const adapter = await this.getAdapter(tenantId);

    if (!adapter.getAvailability) {
      throw new AppError('POS does not support availability check', 400);
    }

    return adapter.getAvailability(date, serviceId);
  }

  /**
   * Cancel order in POS
   */
  async cancelOrder(tenantId: string, orderId: string) {
    const adapter = await this.getAdapter(tenantId);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || !order.externalOrderId) {
      throw new AppError('Order not found or not synced with POS', 404);
    }

    await adapter.cancelOrder(order.externalOrderId);

    await prisma.order.update({
      where: { id: orderId },
      data: { posStatus: 'canceled' },
    });

    logger.info('Order canceled in POS', { orderId, tenantId });
    return true;
  }

  /**
   * Get supported POS providers
   */
  getSupportedProviders() {
    return [
      { id: 'toast', name: 'Toast', type: 'restaurant' },
      { id: 'clover', name: 'Clover', type: 'general' },
      { id: 'lightspeed', name: 'Lightspeed', type: 'retail' },
      { id: 'shopify', name: 'Shopify', type: 'retail' },
      { id: 'square', name: 'Square', type: 'general' },
      { id: 'vagaro', name: 'Vagaro', type: 'salon' },
      { id: 'mindbody', name: 'Mindbody', type: 'fitness' },
      { id: 'boulevard', name: 'Boulevard', type: 'salon' },
    ];
  }
}

export default new POSIntegrationsService();
