import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export const businessTypesService = {
  /**
   * Get all business types
   */
  async getAll(includeInactive = false) {
    return prisma.businessType.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        functions: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get business type by slug
   */
  async getBySlug(slug: string) {
    const businessType = await prisma.businessType.findUnique({
      where: { slug },
      include: {
        functions: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!businessType) {
      throw new AppError('Business type not found', 404);
    }

    return businessType;
  },

  /**
   * Get business type by ID
   */
  async getById(id: string) {
    const businessType = await prisma.businessType.findUnique({
      where: { id },
      include: {
        functions: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!businessType) {
      throw new AppError('Business type not found', 404);
    }

    return businessType;
  },

  /**
   * Create a new business type
   */
  async create(data: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    promptTemplate?: string;
    functions?: Array<{
      name: string;
      description: string;
      parameters?: any;
    }>;
  }) {
    return prisma.businessType.create({
      data: {
        slug: data.slug.toLowerCase().replace(/\s+/g, '-'),
        name: data.name,
        description: data.description,
        icon: data.icon,
        promptTemplate: data.promptTemplate,
        functions: data.functions
          ? {
              create: data.functions.map((f) => ({
                name: f.name,
                description: f.description,
                parameters: f.parameters,
              })),
            }
          : undefined,
      },
      include: {
        functions: true,
      },
    });
  },

  /**
   * Update a business type
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      promptTemplate?: string;
      isActive?: boolean;
    }
  ) {
    return prisma.businessType.update({
      where: { id },
      data,
      include: {
        functions: true,
      },
    });
  },

  /**
   * Delete a business type
   */
  async delete(id: string) {
    return prisma.businessType.delete({
      where: { id },
    });
  },

  /**
   * Add function to business type
   */
  async addFunction(
    businessTypeId: string,
    data: {
      name: string;
      description: string;
      parameters?: any;
    }
  ) {
    return prisma.businessTypeFunction.create({
      data: {
        businessTypeId,
        name: data.name,
        description: data.description,
        parameters: data.parameters,
      },
    });
  },

  /**
   * Update function
   */
  async updateFunction(
    functionId: string,
    data: {
      name?: string;
      description?: string;
      parameters?: any;
      isActive?: boolean;
    }
  ) {
    return prisma.businessTypeFunction.update({
      where: { id: functionId },
      data,
    });
  },

  /**
   * Delete function
   */
  async deleteFunction(functionId: string) {
    return prisma.businessTypeFunction.delete({
      where: { id: functionId },
    });
  },

  /**
   * Get functions for a business type slug
   */
  async getFunctionsBySlug(slug: string) {
    const businessType = await prisma.businessType.findUnique({
      where: { slug },
      include: {
        functions: {
          where: { isActive: true },
          select: {
            name: true,
            description: true,
            parameters: true,
          },
        },
      },
    });

    if (!businessType) {
      throw new AppError('Business type not found', 404);
    }

    return businessType.functions;
  },

  /**
   * Seed default business types
   */
  async seedDefaults() {
    const defaults = [
      {
        slug: 'restaurant',
        name: 'Restaurant / Cafe',
        description: 'Reservations, orders, menu info',
        icon: 'utensils',
        functions: [
          { name: 'check_availability', description: 'Check table availability' },
          { name: 'create_reservation', description: 'Make a reservation' },
          { name: 'cancel_reservation', description: 'Cancel a reservation' },
          { name: 'get_menu', description: 'Get menu items' },
          { name: 'create_order', description: 'Place a food order' },
          { name: 'get_specials', description: 'Get daily specials' },
          { name: 'get_hours', description: 'Get business hours' },
        ],
      },
      {
        slug: 'retail',
        name: 'Retail Store',
        description: 'Product info, inventory, orders',
        icon: 'store',
        functions: [
          { name: 'check_inventory', description: 'Check product availability' },
          { name: 'get_product_info', description: 'Get product information' },
          { name: 'create_order', description: 'Place an order' },
          { name: 'check_order_status', description: 'Check order status' },
          { name: 'get_promotions', description: 'Get current promotions' },
          { name: 'process_return', description: 'Process a return' },
          { name: 'get_hours', description: 'Get business hours' },
        ],
      },
      {
        slug: 'medical',
        name: 'Medical / Dental',
        description: 'Appointment scheduling, patient info',
        icon: 'hospital',
        functions: [
          { name: 'check_availability', description: 'Check appointment availability' },
          { name: 'book_appointment', description: 'Book an appointment' },
          { name: 'cancel_appointment', description: 'Cancel an appointment' },
          { name: 'get_services', description: 'Get available services' },
          { name: 'get_doctors', description: 'Get list of doctors' },
          { name: 'request_prescription', description: 'Request prescription refill' },
          { name: 'get_hours', description: 'Get business hours' },
        ],
      },
      {
        slug: 'hotel',
        name: 'Hotel / Resort',
        description: 'Room booking, amenities, room service',
        icon: 'hotel',
        functions: [
          { name: 'check_availability', description: 'Check room availability' },
          { name: 'book_room', description: 'Book a room' },
          { name: 'cancel_reservation', description: 'Cancel reservation' },
          { name: 'get_room_types', description: 'Get available room types' },
          { name: 'get_amenities', description: 'Get hotel amenities' },
          { name: 'request_service', description: 'Request room service' },
          { name: 'get_hours', description: 'Get business hours' },
        ],
      },
      {
        slug: 'salon',
        name: 'Salon / Spa',
        description: 'Appointment booking, services',
        icon: 'scissors',
        functions: [
          { name: 'check_availability', description: 'Check appointment availability' },
          { name: 'book_appointment', description: 'Book an appointment' },
          { name: 'cancel_appointment', description: 'Cancel an appointment' },
          { name: 'get_services', description: 'Get available services' },
          { name: 'get_stylists', description: 'Get list of stylists' },
          { name: 'get_hours', description: 'Get business hours' },
        ],
      },
      {
        slug: 'real-estate',
        name: 'Real Estate',
        description: 'Property inquiries, viewings',
        icon: 'home',
        functions: [
          { name: 'search_properties', description: 'Search for properties' },
          { name: 'schedule_viewing', description: 'Schedule property viewing' },
          { name: 'get_property_info', description: 'Get property details' },
          { name: 'request_callback', description: 'Request agent callback' },
          { name: 'get_hours', description: 'Get business hours' },
        ],
      },
    ];

    for (const type of defaults) {
      const existing = await prisma.businessType.findUnique({
        where: { slug: type.slug },
      });

      if (!existing) {
        await this.create(type);
      }
    }

    return { message: 'Default business types seeded successfully' };
  },
};
