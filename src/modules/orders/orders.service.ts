import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

interface CreateOrderData {
  tenantId: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  items: Array<{
    serviceId: string;
    name: string;
    price: number;
    quantity: number;
    modifiers?: any;
  }>;
  deliveryType?: string;
  deliveryAddress?: string;
  scheduledFor?: Date;
  notes?: string;
}

export class OrdersService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Create new order
   */
  async createOrder(data: CreateOrderData) {
    try {
      // Calculate totals
      const subtotal = data.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      const tax = subtotal * 0.18; // 18% tax (VAT)
      const total = subtotal + tax;

      // Create order
      const order = await prisma.order.create({
        data: {
          tenantId: data.tenantId,
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          items: data.items as any,
          subtotal,
          tax,
          total,
          deliveryType: data.deliveryType || 'pickup',
          deliveryAddress: data.deliveryAddress,
          scheduledFor: data.scheduledFor,
          notes: data.notes,
          status: 'pending',
          paymentStatus: 'pending',
        },
      });

      logger.info('Order created successfully', {
        orderId: order.id,
        tenantId: data.tenantId,
        total: order.total,
      });

      // Update service stock quantities
      await this.updateStock(data.tenantId, data.items);

      return order;
    } catch (error) {
      logger.error('Create order error', { error });
      throw error;
    }
  }

  /**
   * Get all orders for tenant
   */
  async getOrders(
    tenantId: string,
    filters?: {
      status?: string;
      paymentStatus?: string;
      deliveryType?: string;
      customerPhone?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { tenantId };

      if (filters?.status) where.status = filters.status;
      if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus;
      if (filters?.deliveryType) where.deliveryType = filters.deliveryType;
      if (filters?.customerPhone) where.customerPhone = filters.customerPhone;
      
      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get orders error', { error });
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string, tenantId: string) {
    try {
      const order = await prisma.order.findFirst({
        where: { id, tenantId },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      return order;
    } catch (error) {
      logger.error('Get order by ID error', { error });
      throw error;
    }
  }

  /**
   * Update order
   */
  async updateOrder(
    id: string,
    tenantId: string,
    data: {
      status?: string;
      paymentStatus?: string;
      deliveryAddress?: string;
      scheduledFor?: Date;
      notes?: string;
    }
  ) {
    try {
      const order = await prisma.order.findFirst({
        where: { id, tenantId },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const updated = await prisma.order.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Update timestamps based on status
      if (data.status === 'preparing' && !order.preparedAt) {
        await prisma.order.update({
          where: { id },
          data: { preparedAt: new Date() },
        });
      } else if (data.status === 'completed' && !order.completedAt) {
        await prisma.order.update({
          where: { id },
          data: { completedAt: new Date() },
        });
      } else if (data.status === 'cancelled' && !order.cancelledAt) {
        await prisma.order.update({
          where: { id },
          data: { cancelledAt: new Date() },
        });
      }

      logger.info('Order updated successfully', { orderId: id, tenantId });

      return updated;
    } catch (error) {
      logger.error('Update order error', { error });
      throw error;
    }
  }

  /**
   * Create Stripe checkout link for order
   */
  async createCheckoutLink(id: string, tenantId: string) {
    try {
      const order = await prisma.order.findFirst({
        where: { id, tenantId },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.paymentStatus === 'paid') {
        throw new AppError('Order already paid', 400);
      }

      // Get tenant info
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, stripeAccountId: true },
      });

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Order #${order.id.slice(0, 8)}`,
                description: `${tenant?.name || 'Order'} - ${(order.items as any).length} items`,
              },
              unit_amount: Math.round(order.total * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/orders/${order.id}/success`,
        cancel_url: `${process.env.FRONTEND_URL}/orders/${order.id}/cancel`,
        metadata: {
          orderId: order.id,
          tenantId: tenantId,
        },
      });

      // Update order with checkout URL and payment intent ID
      await prisma.order.update({
        where: { id },
        data: {
          checkoutUrl: session.url!,
          stripePaymentIntentId: session.id,
        },
      });

      logger.info('Checkout link created', {
        orderId: id,
        sessionId: session.id,
      });

      // Send checkout link via SMS/Email
      await this.sendPaymentLink(order, session.url!);

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      logger.error('Create checkout link error', { error });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook (payment confirmation)
   */
  async handleStripeWebhook(event: Stripe.Event) {
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (!orderId) {
          logger.warn('Order ID not found in Stripe webhook');
          return;
        }

        // Update order payment status
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'paid',
            paymentMethod: 'stripe',
            status: 'confirmed',
          },
        });

        logger.info('Order payment confirmed via Stripe', { orderId });

        // Send confirmation email/SMS
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (order) {
          await this.sendOrderConfirmation(order);
        }
      }
    } catch (error) {
      logger.error('Stripe webhook error', { error });
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(tenantId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const where: any = { tenantId };

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [
        totalOrders,
        paidOrders,
        revenue,
        avgOrderValue,
        byStatus,
        byDeliveryType,
      ] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.count({ where: { ...where, paymentStatus: 'paid' } }),
        prisma.order.aggregate({
          where: { ...where, paymentStatus: 'paid' },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: { ...where, paymentStatus: 'paid' },
          _avg: { total: true },
        }),
        prisma.order.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.order.groupBy({
          by: ['deliveryType'],
          where,
          _count: true,
        }),
      ]);

      return {
        totalOrders,
        paidOrders,
        revenue: revenue._sum.total || 0,
        avgOrderValue: avgOrderValue._avg.total || 0,
        byStatus,
        byDeliveryType,
      };
    } catch (error) {
      logger.error('Get order stats error', { error });
      throw error;
    }
  }

  /**
   * Update stock quantities after order
   */
  private async updateStock(
    tenantId: string,
    items: Array<{ serviceId: string; quantity: number }>
  ) {
    try {
      for (const item of items) {
        const service = await prisma.service.findFirst({
          where: { id: item.serviceId, tenantId },
        });

        if (service && service.stockQuantity !== null) {
          await prisma.service.update({
            where: { id: item.serviceId },
            data: {
              stockQuantity: Math.max(0, service.stockQuantity - item.quantity),
            },
          });
        }
      }
    } catch (error) {
      logger.error('Update stock error', { error });
    }
  }

  /**
   * Send payment link via SMS/Email
   */
  private async sendPaymentLink(order: any, checkoutUrl: string) {
    try {
      if (order.customerEmail) {
        const html = `
          <h2>Payment Link</h2>

          <p>Dear ${order.customerName || 'customer'},</p>

          <p>Your order is ready. Click the link below to proceed with payment:</p>

          <p><a href="${checkoutUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Pay Now</a></p>

          <h3>Order details:</h3>
          <ul>
            <li><strong>Order ID:</strong> ${order.id.slice(0, 8)}</li>
            <li><strong>Amount:</strong> $${order.total.toFixed(2)}</li>
            <li><strong>Items:</strong> ${order.items.length}</li>
          </ul>

          <p>Thank you!</p>
        `;

        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: order.customerEmail,
          subject: 'Payment Link - Order #' + order.id.slice(0, 8),
          html,
        });

        logger.info('Payment link email sent', { orderId: order.id });
      }
    } catch (error) {
      logger.error('Send payment link error', { error });
    }
  }

  /**
   * Send order confirmation
   */
  private async sendOrderConfirmation(order: any) {
    try {
      if (!order.customerEmail) return;

      const html = `
        <h2>Order Confirmation</h2>

        <p>Dear ${order.customerName || 'customer'},</p>

        <p>Your order has been confirmed and is being prepared!</p>

        <h3>Order details:</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.id.slice(0, 8)}</li>
          <li><strong>Status:</strong> ${order.status}</li>
          <li><strong>Amount:</strong> $${order.total.toFixed(2)}</li>
          <li><strong>Delivery:</strong> ${order.deliveryType}</li>
          ${order.scheduledFor ? `<li><strong>Estimated time:</strong> ${new Date(order.scheduledFor).toLocaleString('en-US')}</li>` : ''}
        </ul>

        <p>Thank you!</p>
      `;

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: order.customerEmail,
        subject: 'Order Confirmation #' + order.id.slice(0, 8),
        html,
      });

      logger.info('Order confirmation sent', { orderId: order.id });
    } catch (error) {
      logger.error('Send confirmation error', { error });
    }
  }
}

export default new OrdersService();
