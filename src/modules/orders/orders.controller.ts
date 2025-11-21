import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import ordersService from './orders.service';

export class OrdersController {
  async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const data = req.body;

      if (!data.customerPhone || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'customerPhone and items array are required',
        });
      }

      const order = await ordersService.createOrder({ ...data, tenantId });

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { status, paymentStatus, deliveryType, customerPhone, dateFrom, dateTo, page, limit } = req.query;

      const result = await ordersService.getOrders(tenantId, {
        status: status as string,
        paymentStatus: paymentStatus as string,
        deliveryType: deliveryType as string,
        customerPhone: customerPhone as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const order = await ordersService.getOrderById(id, tenantId);

      return res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  async updateOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const order = await ordersService.updateOrder(id, tenantId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCheckoutLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const result = await ordersService.createCheckoutLink(id, tenantId);

      return res.status(200).json({
        success: true,
        message: 'Checkout link created',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { dateFrom, dateTo } = req.query;

      const stats = await ordersService.getOrderStats(
        tenantId,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export default new OrdersController();
