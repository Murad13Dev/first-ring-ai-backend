import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlans() {
  console.log('🌱 Seeding plans...');

  const plans = [
    {
      slug: 'starter',
      name: 'Starter Plan',
      description: 'Designed for small businesses. One AI phone line with essential features.',
      price: 500,
      yearlyPrice: null, // Monthly billing only
      stripeProductId: 'prod_TmUFzafP1HCW08',
      callMinutes: 1000,
      maxCalls: 2000, // Legacy field
      maxUsers: 1,
      maxPhoneLines: 1,
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
    },
    {
      slug: 'professional',
      name: 'Professional Plan',
      description: 'Designed for growing businesses. Up to three AI phone lines with advanced features.',
      price: 1500,
      yearlyPrice: null, // Monthly billing only
      stripeProductId: 'prod_TmUI3uuw8nKYvr',
      callMinutes: 3000,
      maxCalls: 6000, // Legacy field
      maxUsers: 5,
      maxPhoneLines: 3,
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
    },
    {
      slug: 'enterprise',
      name: 'Enterprise Plan',
      description: 'Built for multi-location businesses and clinics. Up to ten AI phone lines.',
      price: 3000,
      yearlyPrice: null, // Monthly billing only
      stripeProductId: 'prod_TmULjPlu2aqieY',
      callMinutes: 6000,
      maxCalls: 12000, // Legacy field
      maxUsers: 20,
      maxPhoneLines: 10,
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
    },
    {
      slug: 'executive',
      name: 'Executive Plan',
      description: 'For high-volume operators and brands. Unlimited AI phone lines with full customization.',
      price: 5000,
      yearlyPrice: null, // Monthly billing only
      stripeProductId: 'prod_TmUMC9AweLww7l',
      callMinutes: 12000,
      maxCalls: 24000, // Legacy field
      maxUsers: 50,
      maxPhoneLines: null, // Unlimited
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
    },
  ];

  for (const plan of plans) {
    const result = await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
    console.log(`✅ ${result.name} - $${result.price}/month`);
  }

  console.log('\n🎉 Plans seeded successfully!');
}

seedPlans()
  .catch((e) => {
    console.error('❌ Error seeding plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
