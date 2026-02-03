import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seedPlans() {
  console.log('🌱 Seeding plans and prices...');

  const plans = [
    {
      slug: 'starter',
      name: 'Starter Plan',
      description: 'Designed for small businesses. One AI phone line with essential features.',
      price: 500, // Base monthly price (kept for backwards compatibility)
      yearlyPrice: 4800, // Yearly price (20% discount: $500 x 12 = $6,000 - $1,200 = $4,800)
      stripeProductId: 'prod_TmUFzafP1HCW08',
      callMinutes: 1000,
      maxCalls: 2000,
      maxUsers: 1,
      maxPhoneLines: 1,
      maxAgents: 1,
      hasUnlimitedPhoneLines: false,
      overageRatePerMinute: 0.75,
      features: [
        'One AI phone line',
        'Up to 1,000 monthly minutes',
        'Inbound call answering',
        'Order & reservation taking',
        'Business hours routing',
        'Email support',
      ],
      isActive: true,
      isPopular: false,
      prices: [
        {
          billingPeriod: 'monthly',
          price: 500,
          stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || 'price_starter_monthly',
        },
        {
          billingPeriod: 'yearly',
          price: 4800,
          stripePriceId: process.env.STRIPE_PRICE_ID_STARTER_YEARLY || 'price_starter_yearly',
        },
      ],
    },
    {
      slug: 'professional',
      name: 'Professional Plan',
      description: 'Designed for growing businesses. Up to three AI phone lines with advanced features.',
      price: 1500,
      yearlyPrice: 12600, // 30% discount: $1,500 x 12 = $18,000 - $5,400 = $12,600
      stripeProductId: 'prod_TmUI3uuw8nKYvr',
      callMinutes: 3000,
      maxCalls: 6000,
      maxUsers: 5,
      maxPhoneLines: 3,
      maxAgents: 3,
      hasUnlimitedPhoneLines: false,
      overageRatePerMinute: 0.75,
      features: [
        'Up to three AI phone lines',
        'Up to 3,000 monthly minutes',
        'Advanced call flows',
        'After-hours handling',
        'CRM & booking system integrations',
        'Priority support',
      ],
      isActive: true,
      isPopular: true,
      prices: [
        {
          billingPeriod: 'monthly',
          price: 1500,
          stripePriceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_professional_monthly',
        },
        {
          billingPeriod: 'yearly',
          price: 12600,
          stripePriceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL_YEARLY || 'price_professional_yearly',
        },
      ],
    },
    {
      slug: 'enterprise',
      name: 'Enterprise Plan',
      description: 'Built for multi-location businesses and clinics. Up to ten AI phone lines.',
      price: 3000,
      yearlyPrice: 21600, // 40% discount: $3,000 x 12 = $36,000 - $14,400 = $21,600
      stripeProductId: 'prod_TmULjPlu2aqieY',
      callMinutes: 6000,
      maxCalls: 12000,
      maxUsers: 20,
      maxPhoneLines: 10,
      maxAgents: 10,
      hasUnlimitedPhoneLines: false,
      overageRatePerMinute: 0.60,
      features: [
        'Up to ten AI phone lines',
        'Up to 6,000 monthly minutes',
        'Custom call logic by department',
        'Analytics reporting',
        'Booking & payment routing',
        'Dedicated onboarding',
        'SLA-backed support',
      ],
      isActive: true,
      isPopular: false,
      prices: [
        {
          billingPeriod: 'monthly',
          price: 3000,
          stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise_monthly',
        },
        {
          billingPeriod: 'yearly',
          price: 21600,
          stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE_YEARLY || 'price_enterprise_yearly',
        },
      ],
    },
    {
      slug: 'executive',
      name: 'Executive Plan',
      description: 'For high-volume operators and brands. Unlimited AI phone lines with full customization.',
      price: 5000,
      yearlyPrice: 30000, // 50% discount: $5,000 x 12 = $60,000 - $30,000 = $30,000
      stripeProductId: 'prod_TmUMC9AweLww7l',
      callMinutes: 12000,
      maxCalls: 24000,
      maxUsers: 50,
      maxPhoneLines: null,
      maxAgents: 999,
      hasUnlimitedPhoneLines: true,
      overageRatePerMinute: 0.50,
      features: [
        'Unlimited AI phone lines',
        'Up to 12,000 monthly minutes',
        'Fully customized AI behavior',
        'White-labeled deployment',
        'Advanced integrations',
        'Dedicated account manager',
        '24/7 premium support',
      ],
      isActive: true,
      isPopular: false,
      prices: [
        {
          billingPeriod: 'monthly',
          price: 5000,
          stripePriceId: process.env.STRIPE_PRICE_ID_EXECUTIVE || 'price_executive_monthly',
        },
        {
          billingPeriod: 'yearly',
          price: 30000,
          stripePriceId: process.env.STRIPE_PRICE_ID_EXECUTIVE_YEARLY || 'price_executive_yearly',
        },
      ],
    },
  ];

  for (const planData of plans) {
    const { prices, ...planFields } = planData;

    // Upsert the plan
    const plan = await prisma.plan.upsert({
      where: { slug: planFields.slug },
      update: planFields,
      create: planFields,
    });

    console.log(`✅ ${plan.name} - $${plan.price}/month`);

    // Upsert the prices for this plan
    for (const priceData of prices) {
      await prisma.planPrice.upsert({
        where: {
          planId_billingPeriod: {
            planId: plan.id,
            billingPeriod: priceData.billingPeriod,
          },
        },
        update: {
          price: priceData.price,
          stripePriceId: priceData.stripePriceId,
        },
        create: {
          planId: plan.id,
          billingPeriod: priceData.billingPeriod,
          price: priceData.price,
          stripePriceId: priceData.stripePriceId,
        },
      });

      console.log(`   └─ ${priceData.billingPeriod}: $${priceData.price} (${priceData.stripePriceId})`);
    }
  }

  // Summary
  const planCount = await prisma.plan.count();
  const priceCount = await prisma.planPrice.count();

  console.log('\n📊 Summary:');
  console.log(`   Plans: ${planCount}`);
  console.log(`   Prices: ${priceCount}`);
  console.log('\n🎉 Plans and prices seeded successfully!');
}

seedPlans()
  .catch((e) => {
    console.error('❌ Error seeding plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
