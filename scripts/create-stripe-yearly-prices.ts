#!/usr/bin/env ts-node

/**
 * Create Stripe Yearly Prices for all plans
 *
 * This script:
 * 1. Reads all plans from the database
 * 2. Creates Stripe YEARLY prices for each plan using their Product IDs
 * 3. Outputs the Price IDs to add to .env file
 *
 * Usage:
 *   npx ts-node scripts/create-stripe-yearly-prices.ts
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
    console.log('🚀 Starting Stripe YEARLY price creation...\n');

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

    console.log(`📋 Found ${plans.length} plans to create yearly prices for:\n`);

    const priceIds: Record<string, string> = {};

    // Create yearly price for each plan
    for (const plan of plans) {
      if (!plan.stripeProductId) {
        console.log(`⚠️  Skipping ${plan.name} - no Product ID`);
        continue;
      }

      // Calculate yearly price (monthly * 12, with optional discount)
      const monthlyPrice = plan.price;
      const yearlyPrice = monthlyPrice * 12; // No discount for now, can adjust later

      console.log(`\n💳 Creating YEARLY price for ${plan.name}...`);
      console.log(`   Product ID: ${plan.stripeProductId}`);
      console.log(`   Monthly: $${monthlyPrice}/month`);
      console.log(`   Yearly: $${yearlyPrice}/year (${plan.price}/month equivalent)`);

      try {
        const result = await stripeService.createPriceForProduct({
          productId: plan.stripeProductId,
          amount: Math.round(yearlyPrice * 100), // Convert dollars to cents
          currency: 'usd',
          interval: 'year',
        });

        console.log(`   ✅ Yearly price created: ${result.priceId}`);
        priceIds[plan.slug] = result.priceId;
      } catch (error: any) {
        console.error(`   ❌ Failed to create yearly price: ${error.message}`);
      }
    }

    // Output results
    console.log('\n' + '='.repeat(60));
    console.log('✅ Yearly price creation completed!');
    console.log('='.repeat(60));
    console.log('\n📝 Add these to your .env file:\n');

    for (const [slug, priceId] of Object.entries(priceIds)) {
      const envKey = `STRIPE_PRICE_ID_${slug.toUpperCase()}_YEARLY`;
      console.log(`${envKey}=${priceId}`);
    }

    // Optionally update .env file
    console.log('\n💡 Auto-updating .env file...');

    // Auto-update .env file
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';

    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch (error) {
      console.log('   ⚠️  .env file not found, creating from .env.example');
      const examplePath = path.join(__dirname, '../.env.example');
      envContent = fs.readFileSync(examplePath, 'utf-8');
    }

    let updated = false;
    for (const [slug, priceId] of Object.entries(priceIds)) {
      const envKey = `STRIPE_PRICE_ID_${slug.toUpperCase()}_YEARLY`;
      const regex = new RegExp(`^${envKey}=.*$`, 'm');

      if (regex.test(envContent)) {
        // Update existing value
        envContent = envContent.replace(regex, `${envKey}=${priceId}`);
        console.log(`   ✏️  Updated ${envKey}`);
        updated = true;
      } else {
        // Add new value (after STRIPE section)
        const stripeSectionMatch = envContent.match(/^STRIPE_PRICE_ID_.*$/m);
        if (stripeSectionMatch) {
          // Find the last STRIPE_PRICE_ID line
          let lastStripeLinePos = envContent.lastIndexOf('STRIPE_PRICE_ID_');
          const lineEnd = envContent.indexOf('\n', lastStripeLinePos);
          const insertPos = lineEnd !== -1 ? lineEnd + 1 : envContent.length;
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

    console.log('\n💡 To use with $1 setup fee, call the subscription checkout API like this:');
    console.log('\n   POST /api/subscriptions/checkout');
    console.log('   {');
    console.log('     "priceId": "<YEARLY_PRICE_ID>",');
    console.log('     "setupFeeAmount": 100  // $1.00 in cents');
    console.log('   }\n');

    console.log('🎉 All done!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
