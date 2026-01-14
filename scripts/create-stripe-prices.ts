#!/usr/bin/env ts-node

/**
 * Create Stripe Prices for all plans
 *
 * This script:
 * 1. Reads all plans from the database
 * 2. Creates Stripe prices for each plan using their Product IDs
 * 3. Outputs the Price IDs to add to .env file
 *
 * Usage:
 *   npx ts-node scripts/create-stripe-prices.ts
 */

import { PrismaClient } from '@prisma/client';
import stripeService from '../src/services/stripe.service';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Starting Stripe price creation...\n');

    // Fetch all active plans from database
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
        stripeProductId: {
          not: null,
        },
      },
      orderBy: {
        price: 'asc',
      },
    });

    if (plans.length === 0) {
      console.log('❌ No plans found with Stripe Product IDs');
      return;
    }

    console.log(`📋 Found ${plans.length} plans to create prices for:\n`);

    const priceIds: Record<string, string> = {};

    // Create price for each plan
    for (const plan of plans) {
      if (!plan.stripeProductId) {
        console.log(`⚠️  Skipping ${plan.name} - no Product ID`);
        continue;
      }

      console.log(`\n💳 Creating price for ${plan.name}...`);
      console.log(`   Product ID: ${plan.stripeProductId}`);
      console.log(`   Amount: $${plan.price}/month`);

      try {
        const result = await stripeService.createPriceForProduct({
          productId: plan.stripeProductId,
          amount: Math.round(plan.price * 100), // Convert dollars to cents
          currency: 'usd',
          interval: 'month',
        });

        console.log(`   ✅ Price created: ${result.priceId}`);
        priceIds[plan.slug] = result.priceId;
      } catch (error: any) {
        console.error(`   ❌ Failed to create price: ${error.message}`);
      }
    }

    // Output results
    console.log('\n' + '='.repeat(60));
    console.log('✅ Price creation completed!');
    console.log('='.repeat(60));
    console.log('\n📝 Add these to your .env file:\n');

    for (const [slug, priceId] of Object.entries(priceIds)) {
      const envKey = `STRIPE_PRICE_ID_${slug.toUpperCase()}`;
      console.log(`${envKey}=${priceId}`);
    }

    // Optionally update .env file
    console.log('\n💡 Would you like to update .env file automatically?');
    console.log('   (You can also copy-paste the values above manually)');

    // Auto-update .env file
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    let updated = false;
    for (const [slug, priceId] of Object.entries(priceIds)) {
      const envKey = `STRIPE_PRICE_ID_${slug.toUpperCase()}`;
      const regex = new RegExp(`^${envKey}=.*$`, 'm');

      if (regex.test(envContent)) {
        // Update existing value
        envContent = envContent.replace(regex, `${envKey}=${priceId}`);
        console.log(`   ✏️  Updated ${envKey}`);
      } else {
        // Add new value (after STRIPE section)
        const stripeSection = envContent.indexOf('# STRIPE');
        if (stripeSection !== -1) {
          const nextSection = envContent.indexOf('\n# ', stripeSection + 1);
          const insertPos = nextSection !== -1 ? nextSection : envContent.length;
          envContent =
            envContent.slice(0, insertPos) +
            `${envKey}=${priceId}\n` +
            envContent.slice(insertPos);
          console.log(`   ➕ Added ${envKey}`);
          updated = true;
        }
      }
    }

    if (updated) {
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ .env file updated successfully!');
      console.log('⚠️  Restart your server to apply changes');
    }

    console.log('\n🎉 All done!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
