/**
 * Create a $1 test plan for Stripe payment testing
 *
 * Usage: npx ts-node scripts/create-test-plan.ts
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover' as any,
});

async function createTestPlan() {
  console.log('🧪 Creating $1 test plan...\n');

  try {
    // 1. Create Stripe Product
    console.log('1. Creating Stripe product...');
    const product = await stripe.products.create({
      name: 'Test Plan',
      description: 'Test plan for payment flow testing - $1/month',
      metadata: {
        type: 'test',
      },
    });
    console.log(`   ✅ Product created: ${product.id}`);

    // 2. Create Monthly Price ($1)
    console.log('2. Creating monthly price ($1)...');
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: 100, // $1.00 in cents
      recurring: {
        interval: 'month',
      },
      metadata: {
        type: 'test',
        billingPeriod: 'monthly',
      },
    });
    console.log(`   ✅ Monthly price: ${monthlyPrice.id}`);

    // 3. Create Yearly Price ($10)
    console.log('3. Creating yearly price ($10)...');
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: 1000, // $10.00 in cents
      recurring: {
        interval: 'year',
      },
      metadata: {
        type: 'test',
        billingPeriod: 'yearly',
      },
    });
    console.log(`   ✅ Yearly price: ${yearlyPrice.id}`);

    // 4. Create Plan in database
    console.log('4. Creating plan in database...');
    const plan = await prisma.plan.upsert({
      where: { slug: 'test' },
      update: {
        name: 'Test Plan',
        description: 'Test plan for payment flow testing',
        price: 1,
        yearlyPrice: 10,
        stripeProductId: product.id,
        callMinutes: 10,
        maxCalls: 10,
        maxUsers: 1,
        maxAgents: 1,
        maxPhoneLines: 1,
        hasUnlimitedPhoneLines: false,
        overageRatePerMinute: 1,
        features: ['Test feature 1', 'Test feature 2'],
        isActive: true,
        isPopular: false,
      },
      create: {
        slug: 'test',
        name: 'Test Plan',
        description: 'Test plan for payment flow testing',
        price: 1,
        yearlyPrice: 10,
        stripeProductId: product.id,
        callMinutes: 10,
        maxCalls: 10,
        maxUsers: 1,
        maxAgents: 1,
        maxPhoneLines: 1,
        hasUnlimitedPhoneLines: false,
        overageRatePerMinute: 1,
        features: ['Test feature 1', 'Test feature 2'],
        isActive: true,
        isPopular: false,
      },
    });
    console.log(`   ✅ Plan created: ${plan.id}`);

    // 5. Create PlanPrices in database
    console.log('5. Creating plan prices in database...');

    // Monthly
    await prisma.planPrice.upsert({
      where: {
        planId_billingPeriod: {
          planId: plan.id,
          billingPeriod: 'monthly',
        },
      },
      update: {
        price: 1,
        stripePriceId: monthlyPrice.id,
      },
      create: {
        planId: plan.id,
        billingPeriod: 'monthly',
        price: 1,
        stripePriceId: monthlyPrice.id,
      },
    });
    console.log(`   ✅ Monthly price record created`);

    // Yearly
    await prisma.planPrice.upsert({
      where: {
        planId_billingPeriod: {
          planId: plan.id,
          billingPeriod: 'yearly',
        },
      },
      update: {
        price: 10,
        stripePriceId: yearlyPrice.id,
      },
      create: {
        planId: plan.id,
        billingPeriod: 'yearly',
        price: 10,
        stripePriceId: yearlyPrice.id,
      },
    });
    console.log(`   ✅ Yearly price record created`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Test plan created successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Plan Slug:      test`);
    console.log(`   Product ID:     ${product.id}`);
    console.log(`   Monthly Price:  ${monthlyPrice.id} ($1/month)`);
    console.log(`   Yearly Price:   ${yearlyPrice.id} ($10/year)`);
    console.log('\n📝 Test with:');
    console.log(`   POST /api/payments/subscription/checkout`);
    console.log(`   {`);
    console.log(`     "tenantId": "<your-tenant-id>",`);
    console.log(`     "customerEmail": "test@example.com",`);
    console.log(`     "planSlug": "test",`);
    console.log(`     "billingPeriod": "monthly"`);
    console.log(`   }`);
    console.log('\n💳 Use Stripe test card: 4242 4242 4242 4242');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPlan();
