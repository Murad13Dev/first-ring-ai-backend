import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

/**
 * Retell AI Service
 * Handles function calls and webhooks from Retell AI agents
 */
export const retellService = {
  /**
   * Handle call started event
   */
  async handleCallStarted(call: any) {
    logger.info('Call started', { callId: call.call_id, from: call.from_number });

    // Log call start in database
    await prisma.callLog.create({
      data: {
        callId: call.call_id,
        fromNumber: call.from_number,
        toNumber: call.to_number,
        status: 'started',
        startedAt: new Date(),
        tenantId: call.metadata?.tenantId,
      },
    });
  },

  /**
   * Handle call ended event
   */
  async handleCallEnded(call: any) {
    logger.info('Call ended', { callId: call.call_id, duration: call.duration });

    // Update call log
    await prisma.callLog.updateMany({
      where: { callId: call.call_id },
      data: {
        status: 'ended',
        duration: call.duration,
        endedAt: new Date(),
      },
    });
  },

  /**
   * Handle call analyzed event
   */
  async handleCallAnalyzed(call: any) {
    logger.info('Call analyzed', { callId: call.call_id });

    // Store transcript and analysis
    await prisma.callLog.updateMany({
      where: { callId: call.call_id },
      data: {
        transcript: call.transcript,
        summary: call.call_analysis?.summary,
        sentiment: call.call_analysis?.sentiment,
      },
    });
  },

  /**
   * Route function calls to appropriate handlers
   */
  async handleFunctionCall(functionName: string, args: any, call: any) {
    const tenantId = call.metadata?.tenantId;

    // If no tenantId, it's a general platform function
    if (!tenantId) {
      return this.handleGeneralFunction(functionName, args);
    }

    return this.handleClientFunction(tenantId, functionName, args);
  },

  /**
   * General platform functions
   * Used by main AI agent to help clients
   */
  async handleGeneralFunction(functionName: string, args: any) {
    switch (functionName) {
      case 'get_pricing_plans':
        return this.getPricingPlans();

      case 'get_features':
        return this.getFeatures();

      case 'create_lead':
        return this.createLead(args);

      case 'schedule_demo':
        return this.scheduleDemo(args);

      case 'check_availability':
        return this.checkDemoAvailability(args);

      case 'get_business_types':
        return this.getBusinessTypes();

      default:
        throw new AppError(`Unknown function: ${functionName}`, 400);
    }
  },

  /**
   * Client-specific functions
   * Used by tenant AI agents
   */
  async handleClientFunction(tenantId: string, functionName: string, args: any) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    const businessType = tenant.businessType.toLowerCase();

    // Restaurant functions
    if (businessType.includes('restaurant') || businessType.includes('cafe') || businessType.includes('food')) {
      return this.handleRestaurantFunction(tenantId, functionName, args);
    }

    // Retail functions
    if (businessType.includes('retail') || businessType.includes('store') || businessType.includes('shop')) {
      return this.handleRetailFunction(tenantId, functionName, args);
    }

    // Medical/Hospital functions
    if (businessType.includes('medical') || businessType.includes('hospital') || businessType.includes('clinic') || businessType.includes('dental') || businessType.includes('doctor')) {
      return this.handleMedicalFunction(tenantId, functionName, args);
    }

    // Hotel functions
    if (businessType.includes('hotel') || businessType.includes('motel') || businessType.includes('resort') || businessType.includes('lodging')) {
      return this.handleHotelFunction(tenantId, functionName, args);
    }

    // Salon/Spa functions
    if (businessType.includes('salon') || businessType.includes('spa') || businessType.includes('beauty') || businessType.includes('barber')) {
      return this.handleSalonFunction(tenantId, functionName, args);
    }

    // Real Estate functions
    if (businessType.includes('real estate') || businessType.includes('realty') || businessType.includes('property')) {
      return this.handleRealEstateFunction(tenantId, functionName, args);
    }

    // Default functions for other business types
    return this.handleDefaultFunction(tenantId, functionName, args);
  },

  // ============================================
  // GENERAL PLATFORM FUNCTIONS
  // ============================================

  async getPricingPlans() {
    return {
      plans: [
        {
          name: 'Starter',
          price: 49,
          calls: 100,
          features: ['AI Phone Agent', 'Basic Analytics', 'Email Support'],
        },
        {
          name: 'Professional',
          price: 149,
          calls: 500,
          features: ['AI Phone Agent', 'Advanced Analytics', 'Priority Support', 'Custom Prompts'],
        },
        {
          name: 'Enterprise',
          price: 499,
          calls: 2000,
          features: ['AI Phone Agent', 'Full Analytics', '24/7 Support', 'Custom Integration', 'Dedicated Manager'],
        },
      ],
    };
  },

  async getFeatures() {
    return {
      features: [
        'Multi-language support (8+ languages)',
        'Custom AI prompts for your business',
        'Booking and reservation management',
        'Order taking and processing',
        'FAQ handling',
        'Lead capture',
        'CRM integration',
        'Analytics dashboard',
        'Call recordings and transcripts',
      ],
    };
  },

  async createLead(args: { name: string; email: string; phone: string; businessType: string; businessName?: string; message?: string }) {
    const lead = await prisma.lead.create({
      data: {
        contactName: args.name,
        email: args.email,
        phone: args.phone,
        businessName: args.businessName || 'Unknown',
        businessType: args.businessType,
        selectedPlan: 'starter',
        source: 'retell_ai',
        aiNotes: args.message,
        status: 'new',
      },
    });

    return {
      success: true,
      message: `Thank you ${args.name}! We've received your information and will contact you shortly.`,
      leadId: lead.id,
    };
  },

  async scheduleDemo(args: { name: string; email: string; phone: string; preferredDate: string; preferredTime: string }) {
    // Create demo booking
    const demo = await prisma.lead.create({
      data: {
        contactName: args.name,
        email: args.email,
        phone: args.phone,
        businessName: 'Demo Request',
        businessType: 'unknown',
        selectedPlan: 'starter',
        source: 'retell_ai_demo',
        status: 'demo_scheduled',
        aiNotes: `Demo requested for ${args.preferredDate} at ${args.preferredTime}`,
      },
    });

    return {
      success: true,
      message: `Demo scheduled for ${args.preferredDate} at ${args.preferredTime}. We'll send a confirmation email to ${args.email}.`,
      demoId: demo.id,
    };
  },

  async checkDemoAvailability(args: { date: string }) {
    // Return available time slots
    return {
      date: args.date,
      availableSlots: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'],
    };
  },

  async getBusinessTypes() {
    return {
      businessTypes: [
        { id: 'restaurant', name: 'Restaurant / Cafe', description: 'Reservations, orders, menu info' },
        { id: 'retail', name: 'Retail Store', description: 'Product info, inventory, orders' },
        { id: 'salon', name: 'Salon / Spa', description: 'Appointment booking, services' },
        { id: 'medical', name: 'Medical / Dental', description: 'Appointment scheduling, patient info' },
        { id: 'realestate', name: 'Real Estate', description: 'Property inquiries, viewings' },
        { id: 'other', name: 'Other', description: 'Custom AI agent for your business' },
      ],
    };
  },

  // ============================================
  // RESTAURANT FUNCTIONS
  // ============================================

  async handleRestaurantFunction(tenantId: string, functionName: string, args: any) {
    switch (functionName) {
      case 'check_availability':
        return this.checkRestaurantAvailability(tenantId, args);

      case 'create_reservation':
        return this.createReservation(tenantId, args);

      case 'cancel_reservation':
        return this.cancelReservation(tenantId, args);

      case 'get_menu':
        return this.getMenu(tenantId, args);

      case 'create_order':
        return this.createFoodOrder(tenantId, args);

      case 'get_hours':
        return this.getBusinessHours(tenantId);

      case 'get_specials':
        return this.getDailySpecials(tenantId);

      default:
        throw new AppError(`Unknown restaurant function: ${functionName}`, 400);
    }
  },

  async checkRestaurantAvailability(tenantId: string, args: { date: string; time: string; partySize: number }) {
    // Check available tables
    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        dateTime: { gte: new Date(args.date), lt: new Date(new Date(args.date).getTime() + 86400000) },
        status: { not: 'cancelled' },
      },
    });

    // Simple availability check
    const isAvailable = bookings.length < 20; // Assuming 20 tables

    return {
      available: isAvailable,
      date: args.date,
      time: args.time,
      partySize: args.partySize,
      message: isAvailable
        ? `Yes, we have availability for ${args.partySize} guests at ${args.time} on ${args.date}.`
        : `Sorry, we're fully booked at ${args.time}. Would you like to try a different time?`,
    };
  },

  async createReservation(tenantId: string, args: {
    name: string;
    phone: string;
    email?: string;
    date: string;
    time: string;
    partySize: number;
    notes?: string;
  }) {
    const dateTime = new Date(`${args.date} ${args.time}`);
    const booking = await prisma.booking.create({
      data: {
        tenantId,
        customerName: args.name,
        customerPhone: args.phone,
        customerEmail: args.email,
        serviceName: 'Table Reservation',
        dateTime,
        partySize: args.partySize,
        notes: args.notes,
        status: 'confirmed',
      },
    });

    return {
      success: true,
      bookingId: booking.id,
      message: `Reservation confirmed for ${args.name}, party of ${args.partySize}, on ${args.date} at ${args.time}. We'll see you then!`,
    };
  },

  async cancelReservation(tenantId: string, args: { bookingId?: string; phone?: string; name?: string }) {
    let booking;

    if (args.bookingId) {
      booking = await prisma.booking.findFirst({
        where: { id: args.bookingId, tenantId },
      });
    } else if (args.phone) {
      booking = await prisma.booking.findFirst({
        where: { customerPhone: args.phone, tenantId, status: 'confirmed' },
        orderBy: { dateTime: 'desc' },
      });
    }

    if (!booking) {
      return {
        success: false,
        message: "I couldn't find your reservation. Can you provide your phone number or booking ID?",
      };
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });

    return {
      success: true,
      message: `Your reservation for ${booking.date.toLocaleDateString()} has been cancelled. We hope to see you another time!`,
    };
  },

  async getMenu(tenantId: string, args?: { category?: string }) {
    const where: any = { tenantId, isAvailable: true };
    if (args?.category) {
      where.category = args.category;
    }

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: { category: 'asc' },
    });

    return {
      items: items.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
      })),
    };
  },

  async createFoodOrder(tenantId: string, args: {
    customerName: string;
    customerPhone: string;
    items: Array<{ itemId: string; quantity: number; name?: string; price?: number }>;
    type: 'pickup' | 'delivery';
    address?: string;
    notes?: string;
  }) {
    const order = await prisma.order.create({
      data: {
        tenantId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        items: args.items,
        subtotal: 0,
        total: 0,
        deliveryType: args.type,
        deliveryAddress: args.address,
        notes: args.notes,
        status: 'pending',
      },
    });

    return {
      success: true,
      orderId: order.id,
      message: `Your ${args.type} order has been placed! Order number: ${order.id.slice(-6).toUpperCase()}. We'll have it ready in about 20-30 minutes.`,
    };
  },

  async getDailySpecials(tenantId: string) {
    const specials = await prisma.menuItem.findMany({
      where: { tenantId, isSpecial: true },
    });

    return {
      specials: specials.map((s) => ({
        name: s.name,
        description: s.description,
        price: s.price,
      })),
    };
  },

  // ============================================
  // RETAIL FUNCTIONS
  // ============================================

  async handleRetailFunction(tenantId: string, functionName: string, args: any) {
    switch (functionName) {
      case 'check_inventory':
        return this.checkInventory(tenantId, args);

      case 'get_product_info':
        return this.getProductInfo(tenantId, args);

      case 'create_order':
        return this.createRetailOrder(tenantId, args);

      case 'check_order_status':
        return this.checkOrderStatus(tenantId, args);

      case 'get_hours':
        return this.getBusinessHours(tenantId);

      case 'get_promotions':
        return this.getPromotions(tenantId);

      case 'process_return':
        return this.processReturn(tenantId, args);

      default:
        throw new AppError(`Unknown retail function: ${functionName}`, 400);
    }
  },

  async checkInventory(tenantId: string, args: { productName?: string; sku?: string }) {
    const where: any = { tenantId };
    if (args.productName) {
      where.name = { contains: args.productName, mode: 'insensitive' };
    }
    if (args.sku) {
      where.sku = args.sku;
    }

    const products = await prisma.product.findMany({
      where,
      take: 5,
    });

    if (products.length === 0) {
      return {
        found: false,
        message: "I couldn't find that product. Could you provide more details or try a different name?",
      };
    }

    return {
      found: true,
      products: products.map((p) => ({
        name: p.name,
        sku: p.sku,
        price: p.price,
        inStock: p.quantity > 0,
        quantity: p.quantity,
      })),
    };
  },

  async getProductInfo(tenantId: string, args: { productId?: string; productName?: string }) {
    let product;

    if (args.productId) {
      product = await prisma.product.findFirst({
        where: { id: args.productId, tenantId },
      });
    } else if (args.productName) {
      product = await prisma.product.findFirst({
        where: {
          tenantId,
          name: { contains: args.productName, mode: 'insensitive' },
        },
      });
    }

    if (!product) {
      return {
        found: false,
        message: "I couldn't find that product.",
      };
    }

    return {
      found: true,
      product: {
        name: product.name,
        description: product.description,
        price: product.price,
        inStock: product.quantity > 0,
        sku: product.sku,
      },
    };
  },

  async createRetailOrder(tenantId: string, args: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    items: Array<{ productId: string; quantity: number }>;
    type: 'pickup' | 'delivery';
    address?: string;
  }) {
    const order = await prisma.order.create({
      data: {
        tenantId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        customerEmail: args.customerEmail,
        items: args.items,
        subtotal: 0,
        total: 0,
        deliveryType: args.type,
        deliveryAddress: args.address,
        status: 'pending',
      },
    });

    return {
      success: true,
      orderId: order.id,
      message: `Your order has been placed! Order number: ${order.id.slice(-6).toUpperCase()}. ${
        args.type === 'pickup'
          ? "We'll notify you when it's ready for pickup."
          : "We'll deliver it to your address."
      }`,
    };
  },

  async checkOrderStatus(tenantId: string, args: { orderId?: string; phone?: string }) {
    let order;

    if (args.orderId) {
      order = await prisma.order.findFirst({
        where: { id: args.orderId, tenantId },
      });
    } else if (args.phone) {
      order = await prisma.order.findFirst({
        where: { customerPhone: args.phone, tenantId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!order) {
      return {
        found: false,
        message: "I couldn't find your order. Can you provide your order number or phone number?",
      };
    }

    const statusMessages: Record<string, string> = {
      pending: 'Your order is being processed.',
      confirmed: 'Your order has been confirmed and is being prepared.',
      ready: 'Your order is ready for pickup!',
      shipped: 'Your order has been shipped.',
      delivered: 'Your order has been delivered.',
      cancelled: 'Your order was cancelled.',
    };

    return {
      found: true,
      orderId: order.id,
      status: order.status,
      message: statusMessages[order.status] || `Order status: ${order.status}`,
    };
  },

  async getPromotions(tenantId: string) {
    // Get active promotions
    const promotions = await prisma.promotion.findMany({
      where: {
        tenantId,
        isActive: true,
        endDate: { gte: new Date() },
      },
    });

    if (promotions.length === 0) {
      return {
        hasPromotions: false,
        message: "We don't have any active promotions right now, but check back soon!",
      };
    }

    return {
      hasPromotions: true,
      promotions: promotions.map((p) => ({
        name: p.name,
        description: p.description,
        discount: p.discount,
        code: p.code,
      })),
    };
  },

  async processReturn(tenantId: string, args: { orderId: string; reason: string; items?: string[] }) {
    const order = await prisma.order.findFirst({
      where: { id: args.orderId, tenantId },
    });

    if (!order) {
      return {
        success: false,
        message: "I couldn't find that order. Please provide a valid order number.",
      };
    }

    // Create return request
    await prisma.order.update({
      where: { id: args.orderId },
      data: {
        status: 'return_requested',
        notes: `Return reason: ${args.reason}`,
      },
    });

    return {
      success: true,
      message: `Return request submitted for order ${args.orderId.slice(-6).toUpperCase()}. Our team will contact you within 24 hours to process the return.`,
    };
  },

  // ============================================
  // MEDICAL/HOSPITAL FUNCTIONS
  // ============================================

  async handleMedicalFunction(tenantId: string, functionName: string, args: any) {
    switch (functionName) {
      case 'check_availability':
        return this.checkAppointmentAvailability(tenantId, args);

      case 'book_appointment':
        return this.bookAppointment(tenantId, args);

      case 'cancel_appointment':
        return this.cancelAppointment(tenantId, args);

      case 'get_services':
        return this.getMedicalServices(tenantId);

      case 'get_hours':
        return this.getBusinessHours(tenantId);

      case 'get_doctors':
        return this.getDoctors(tenantId, args);

      case 'request_prescription':
        return this.requestPrescriptionRefill(tenantId, args);

      default:
        return this.handleDefaultFunction(tenantId, functionName, args);
    }
  },

  async checkAppointmentAvailability(tenantId: string, args: { date: string; doctorId?: string; serviceType?: string }) {
    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        dateTime: { gte: new Date(args.date), lt: new Date(new Date(args.date).getTime() + 86400000) },
        status: { not: 'cancelled' },
      },
    });

    // Available time slots
    const allSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'];
    const bookedTimes = bookings.map(b => b.dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    return {
      date: args.date,
      availableSlots,
      message: availableSlots.length > 0
        ? `We have ${availableSlots.length} available slots on ${args.date}.`
        : `Sorry, we're fully booked on ${args.date}. Would you like to try another date?`,
    };
  },

  async bookAppointment(tenantId: string, args: {
    patientName: string;
    phone: string;
    email?: string;
    date: string;
    time: string;
    serviceType: string;
    doctorId?: string;
    notes?: string;
  }) {
    const dateTime = new Date(`${args.date} ${args.time}`);
    const booking = await prisma.booking.create({
      data: {
        tenantId,
        customerName: args.patientName,
        customerPhone: args.phone,
        customerEmail: args.email,
        serviceName: args.serviceType,
        dateTime,
        notes: args.notes,
        status: 'confirmed',
      },
    });

    return {
      success: true,
      appointmentId: booking.id,
      message: `Appointment confirmed for ${args.patientName} on ${args.date} at ${args.time}. Please arrive 15 minutes early.`,
    };
  },

  async cancelAppointment(tenantId: string, args: { appointmentId?: string; phone?: string }) {
    let booking;
    if (args.appointmentId) {
      booking = await prisma.booking.findFirst({
        where: { id: args.appointmentId, tenantId },
      });
    } else if (args.phone) {
      booking = await prisma.booking.findFirst({
        where: { customerPhone: args.phone, tenantId, status: 'confirmed' },
        orderBy: { dateTime: 'asc' },
      });
    }

    if (!booking) {
      return { success: false, message: "I couldn't find your appointment." };
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });

    return {
      success: true,
      message: `Your appointment on ${booking.date.toLocaleDateString()} has been cancelled.`,
    };
  },

  async getMedicalServices(tenantId: string) {
    const services = await prisma.service.findMany({
      where: { tenantId },
    });

    return {
      services: services.map(s => ({
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price,
      })),
    };
  },

  async getDoctors(tenantId: string, args?: { specialty?: string }) {
    // This would need a Doctor model, returning mock data for now
    return {
      doctors: [
        { name: 'Dr. Smith', specialty: 'General Practice', available: true },
        { name: 'Dr. Johnson', specialty: 'Pediatrics', available: true },
      ],
    };
  },

  async requestPrescriptionRefill(tenantId: string, args: { patientName: string; phone: string; medication: string }) {
    await prisma.message.create({
      data: {
        tenantId,
        senderName: args.patientName,
        senderPhone: args.phone,
        content: `Prescription refill request: ${args.medication}`,
        source: 'retell_ai',
      },
    });

    return {
      success: true,
      message: `Your prescription refill request for ${args.medication} has been submitted. We'll contact you when it's ready.`,
    };
  },

  // ============================================
  // HOTEL FUNCTIONS
  // ============================================

  async handleHotelFunction(tenantId: string, functionName: string, args: any) {
    switch (functionName) {
      case 'check_availability':
        return this.checkRoomAvailability(tenantId, args);

      case 'book_room':
        return this.bookRoom(tenantId, args);

      case 'cancel_reservation':
        return this.cancelHotelReservation(tenantId, args);

      case 'get_room_types':
        return this.getRoomTypes(tenantId);

      case 'get_amenities':
        return this.getHotelAmenities(tenantId);

      case 'get_hours':
        return this.getBusinessHours(tenantId);

      case 'request_service':
        return this.requestHotelService(tenantId, args);

      default:
        return this.handleDefaultFunction(tenantId, functionName, args);
    }
  },

  async checkRoomAvailability(tenantId: string, args: { checkIn: string; checkOut: string; guests: number; roomType?: string }) {
    return {
      available: true,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      guests: args.guests,
      rooms: [
        { type: 'Standard', price: 99, available: 5 },
        { type: 'Deluxe', price: 149, available: 3 },
        { type: 'Suite', price: 249, available: 1 },
      ],
      message: `We have rooms available from ${args.checkIn} to ${args.checkOut} for ${args.guests} guests.`,
    };
  },

  async bookRoom(tenantId: string, args: {
    guestName: string;
    phone: string;
    email?: string;
    checkIn: string;
    checkOut: string;
    roomType: string;
    guests: number;
    specialRequests?: string;
  }) {
    const dateTime = new Date(`${args.checkIn} 15:00`);
    const booking = await prisma.booking.create({
      data: {
        tenantId,
        customerName: args.guestName,
        customerPhone: args.phone,
        customerEmail: args.email,
        serviceName: `${args.roomType} Room`,
        dateTime,
        partySize: args.guests,
        notes: `Check-out: ${args.checkOut}. ${args.specialRequests || ''}`,
        status: 'confirmed',
      },
    });

    return {
      success: true,
      reservationId: booking.id,
      message: `Room booked for ${args.guestName}. ${args.roomType} room from ${args.checkIn} to ${args.checkOut}. Confirmation will be sent to ${args.email || args.phone}.`,
    };
  },

  async cancelHotelReservation(tenantId: string, args: { reservationId?: string; phone?: string }) {
    let booking;
    if (args.reservationId) {
      booking = await prisma.booking.findFirst({
        where: { id: args.reservationId, tenantId },
      });
    } else if (args.phone) {
      booking = await prisma.booking.findFirst({
        where: { customerPhone: args.phone, tenantId, status: 'confirmed' },
        orderBy: { dateTime: 'desc' },
      });
    }

    if (!booking) {
      return { success: false, message: "I couldn't find your reservation." };
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });

    return {
      success: true,
      message: 'Your reservation has been cancelled. Any charges will be refunded within 5-7 business days.',
    };
  },

  async getRoomTypes(tenantId: string) {
    return {
      roomTypes: [
        { name: 'Standard Room', description: 'Queen bed, city view', maxGuests: 2, price: 99 },
        { name: 'Deluxe Room', description: 'King bed, ocean view, balcony', maxGuests: 2, price: 149 },
        { name: 'Suite', description: 'Separate living area, 2 beds, premium amenities', maxGuests: 4, price: 249 },
        { name: 'Family Room', description: '2 queen beds, connecting available', maxGuests: 4, price: 179 },
      ],
    };
  },

  async getHotelAmenities(tenantId: string) {
    return {
      amenities: [
        'Free WiFi', 'Pool', 'Fitness Center', 'Restaurant', 'Room Service',
        'Concierge', 'Valet Parking', 'Business Center', 'Spa',
      ],
    };
  },

  async requestHotelService(tenantId: string, args: { roomNumber: string; service: string; notes?: string }) {
    await prisma.message.create({
      data: {
        tenantId,
        senderName: `Room ${args.roomNumber}`,
        senderPhone: '',
        content: `Service request: ${args.service}. ${args.notes || ''}`,
        source: 'retell_ai',
      },
    });

    return {
      success: true,
      message: `Your request for ${args.service} has been submitted. Someone will assist you shortly.`,
    };
  },

  // ============================================
  // SALON/SPA FUNCTIONS
  // ============================================

  async handleSalonFunction(tenantId: string, functionName: string, args: any) {
    switch (functionName) {
      case 'check_availability':
        return this.checkSalonAvailability(tenantId, args);

      case 'book_appointment':
        return this.bookSalonAppointment(tenantId, args);

      case 'cancel_appointment':
        return this.cancelAppointment(tenantId, args);

      case 'get_services':
        return this.getSalonServices(tenantId);

      case 'get_stylists':
        return this.getStylists(tenantId);

      case 'get_hours':
        return this.getBusinessHours(tenantId);

      default:
        return this.handleDefaultFunction(tenantId, functionName, args);
    }
  },

  async checkSalonAvailability(tenantId: string, args: { date: string; service?: string; stylistId?: string }) {
    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        dateTime: { gte: new Date(args.date), lt: new Date(new Date(args.date).getTime() + 86400000) },
        status: { not: 'cancelled' },
      },
    });

    const allSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
    const bookedTimes = bookings.map(b => b.dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    return {
      date: args.date,
      availableSlots,
      message: availableSlots.length > 0
        ? `We have ${availableSlots.length} available time slots on ${args.date}.`
        : `We're fully booked on ${args.date}. Would you like to try another date?`,
    };
  },

  async bookSalonAppointment(tenantId: string, args: {
    clientName: string;
    phone: string;
    email?: string;
    date: string;
    time: string;
    service: string;
    stylistId?: string;
    notes?: string;
  }) {
    const dateTime = new Date(`${args.date} ${args.time}`);
    const booking = await prisma.booking.create({
      data: {
        tenantId,
        customerName: args.clientName,
        customerPhone: args.phone,
        customerEmail: args.email,
        serviceName: args.service,
        dateTime,
        notes: args.notes,
        status: 'confirmed',
      },
    });

    return {
      success: true,
      appointmentId: booking.id,
      message: `Appointment booked for ${args.clientName}. ${args.service} on ${args.date} at ${args.time}. See you then!`,
    };
  },

  async getSalonServices(tenantId: string) {
    const services = await prisma.service.findMany({
      where: { tenantId },
    });

    return {
      services: services.map(s => ({
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price,
      })),
    };
  },

  async getStylists(tenantId: string) {
    // Would need a Stylist/Staff model
    return {
      stylists: [
        { name: 'Maria', specialties: ['Haircuts', 'Color', 'Styling'] },
        { name: 'John', specialties: ['Men\'s cuts', 'Beard trim'] },
        { name: 'Sarah', specialties: ['Nails', 'Pedicure', 'Waxing'] },
      ],
    };
  },

  // ============================================
  // REAL ESTATE FUNCTIONS
  // ============================================

  async handleRealEstateFunction(tenantId: string, functionName: string, args: any) {
    switch (functionName) {
      case 'search_properties':
        return this.searchProperties(tenantId, args);

      case 'schedule_viewing':
        return this.scheduleViewing(tenantId, args);

      case 'get_property_info':
        return this.getPropertyInfo(tenantId, args);

      case 'request_callback':
        return this.scheduleCallback(tenantId, args);

      case 'get_hours':
        return this.getBusinessHours(tenantId);

      default:
        return this.handleDefaultFunction(tenantId, functionName, args);
    }
  },

  async searchProperties(tenantId: string, args: {
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    location?: string;
  }) {
    // Would need a Property model, returning mock for now
    return {
      properties: [
        { id: '1', type: 'House', price: 450000, bedrooms: 3, location: 'Downtown', address: '123 Main St' },
        { id: '2', type: 'Apartment', price: 250000, bedrooms: 2, location: 'Midtown', address: '456 Oak Ave' },
        { id: '3', type: 'Condo', price: 350000, bedrooms: 2, location: 'Waterfront', address: '789 Beach Rd' },
      ],
      message: `I found 3 properties matching your criteria.`,
    };
  },

  async scheduleViewing(tenantId: string, args: {
    propertyId: string;
    clientName: string;
    phone: string;
    email?: string;
    preferredDate: string;
    preferredTime: string;
  }) {
    const dateTime = new Date(`${args.preferredDate} ${args.preferredTime}`);
    const booking = await prisma.booking.create({
      data: {
        tenantId,
        customerName: args.clientName,
        customerPhone: args.phone,
        customerEmail: args.email,
        serviceName: 'Property Viewing',
        dateTime,
        notes: `Property ID: ${args.propertyId}`,
        status: 'confirmed',
      },
    });

    return {
      success: true,
      viewingId: booking.id,
      message: `Viewing scheduled for ${args.clientName} on ${args.preferredDate} at ${args.preferredTime}. An agent will meet you at the property.`,
    };
  },

  async getPropertyInfo(tenantId: string, args: { propertyId: string }) {
    // Would pull from Property model
    return {
      property: {
        id: args.propertyId,
        type: 'House',
        price: 450000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        address: '123 Main St',
        description: 'Beautiful 3-bedroom home with modern kitchen, hardwood floors, and large backyard.',
        features: ['Garage', 'Central AC', 'Updated Kitchen', 'Hardwood Floors'],
      },
    };
  },

  // ============================================
  // DEFAULT/COMMON FUNCTIONS
  // ============================================

  async handleDefaultFunction(tenantId: string, functionName: string, args: any) {
    switch (functionName) {
      case 'get_hours':
        return this.getBusinessHours(tenantId);

      case 'get_location':
        return this.getLocation(tenantId);

      case 'leave_message':
        return this.leaveMessage(tenantId, args);

      case 'schedule_callback':
        return this.scheduleCallback(tenantId, args);

      case 'get_faq':
        return this.getFAQ(tenantId, args);

      default:
        throw new AppError(`Unknown function: ${functionName}`, 400);
    }
  },

  async getBusinessHours(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessHours: true, name: true },
    });

    return {
      businessName: tenant?.name,
      hours: tenant?.businessHours || {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '10:00 AM - 4:00 PM',
        sunday: 'Closed',
      },
    };
  },

  async getLocation(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { address: true, name: true },
    });

    return {
      businessName: tenant?.name,
      address: tenant?.address,
    };
  },

  async leaveMessage(tenantId: string, args: { name: string; phone: string; message: string }) {
    await prisma.message.create({
      data: {
        tenantId,
        senderName: args.name,
        senderPhone: args.phone,
        content: args.message,
        source: 'retell_ai',
      },
    });

    return {
      success: true,
      message: `Thank you ${args.name}, your message has been recorded. Someone will get back to you soon.`,
    };
  },

  async scheduleCallback(tenantId: string, args: { name: string; phone: string; preferredTime?: string }) {
    await prisma.callback.create({
      data: {
        tenantId,
        customerName: args.name,
        customerPhone: args.phone,
        preferredTime: args.preferredTime,
        status: 'pending',
      },
    });

    return {
      success: true,
      message: `We've scheduled a callback for ${args.name}. ${
        args.preferredTime ? `We'll try to call around ${args.preferredTime}.` : "We'll call you as soon as possible."
      }`,
    };
  },

  async getFAQ(tenantId: string, args?: { question?: string }) {
    const faqs = await prisma.fAQ.findMany({
      where: { tenantId },
    });

    return {
      faqs: faqs.map((f) => ({
        question: f.question,
        answer: f.answer,
      })),
    };
  },

  /**
   * Get available functions for a tenant
   */
  async getAvailableFunctions(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    const businessType = tenant.businessType.toLowerCase();

    // Common functions for all business types
    const commonFunctions = [
      { name: 'get_hours', description: 'Get business hours' },
      { name: 'get_location', description: 'Get business location and address' },
      { name: 'leave_message', description: 'Leave a message for the business' },
      { name: 'schedule_callback', description: 'Schedule a callback' },
      { name: 'get_faq', description: 'Get frequently asked questions' },
    ];

    // Restaurant-specific functions
    if (businessType.includes('restaurant') || businessType.includes('cafe')) {
      return [
        ...commonFunctions,
        { name: 'check_availability', description: 'Check table availability' },
        { name: 'create_reservation', description: 'Make a reservation' },
        { name: 'cancel_reservation', description: 'Cancel a reservation' },
        { name: 'get_menu', description: 'Get menu items' },
        { name: 'create_order', description: 'Place a food order' },
        { name: 'get_specials', description: 'Get daily specials' },
      ];
    }

    // Retail-specific functions
    if (businessType.includes('retail') || businessType.includes('store') || businessType.includes('shop')) {
      return [
        ...commonFunctions,
        { name: 'check_inventory', description: 'Check product availability' },
        { name: 'get_product_info', description: 'Get product information' },
        { name: 'create_order', description: 'Place an order' },
        { name: 'check_order_status', description: 'Check order status' },
        { name: 'get_promotions', description: 'Get current promotions' },
        { name: 'process_return', description: 'Process a return' },
      ];
    }

    // Medical/Hospital-specific functions
    if (businessType.includes('medical') || businessType.includes('hospital') || businessType.includes('clinic') || businessType.includes('dental')) {
      return [
        ...commonFunctions,
        { name: 'check_availability', description: 'Check appointment availability' },
        { name: 'book_appointment', description: 'Book an appointment' },
        { name: 'cancel_appointment', description: 'Cancel an appointment' },
        { name: 'get_services', description: 'Get available services' },
        { name: 'get_doctors', description: 'Get list of doctors' },
        { name: 'request_prescription', description: 'Request prescription refill' },
      ];
    }

    // Hotel-specific functions
    if (businessType.includes('hotel') || businessType.includes('motel') || businessType.includes('resort')) {
      return [
        ...commonFunctions,
        { name: 'check_availability', description: 'Check room availability' },
        { name: 'book_room', description: 'Book a room' },
        { name: 'cancel_reservation', description: 'Cancel reservation' },
        { name: 'get_room_types', description: 'Get available room types' },
        { name: 'get_amenities', description: 'Get hotel amenities' },
        { name: 'request_service', description: 'Request room service' },
      ];
    }

    // Salon/Spa-specific functions
    if (businessType.includes('salon') || businessType.includes('spa') || businessType.includes('beauty') || businessType.includes('barber')) {
      return [
        ...commonFunctions,
        { name: 'check_availability', description: 'Check appointment availability' },
        { name: 'book_appointment', description: 'Book an appointment' },
        { name: 'cancel_appointment', description: 'Cancel an appointment' },
        { name: 'get_services', description: 'Get available services' },
        { name: 'get_stylists', description: 'Get list of stylists' },
      ];
    }

    // Real Estate-specific functions
    if (businessType.includes('real estate') || businessType.includes('realty') || businessType.includes('property')) {
      return [
        ...commonFunctions,
        { name: 'search_properties', description: 'Search for properties' },
        { name: 'schedule_viewing', description: 'Schedule property viewing' },
        { name: 'get_property_info', description: 'Get property details' },
        { name: 'request_callback', description: 'Request agent callback' },
      ];
    }

    return commonFunctions;
  },
};
