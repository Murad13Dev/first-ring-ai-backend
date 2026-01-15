#!/usr/bin/env node

/**
 * Display tenant information (for manual setup)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        businessType: true,
        twilioNumber: true,
        retellAgentId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          RETELL AI MANUAL SETUP - TENANT LIST                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (tenants.length === 0) {
      console.log('❌ No tenants found.\n');
      console.log('To create a new tenant:');
      console.log('  POST /api/tenants/create\n');
      return;
    }

    console.log(`📊 Total ${tenants.length} tenant(s) found:\n`);

    tenants.forEach((tenant, index) => {
      const hasPhone = tenant.twilioNumber ? '✅' : '❌';
      const hasAgent = tenant.retellAgentId ? '✅' : '❌';

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   Business Type: ${tenant.businessType}`);
      console.log(`   ${hasPhone} Twilio Number: ${tenant.twilioNumber || 'NOT CONFIGURED'}`);
      console.log(`   ${hasAgent} Retell Agent: ${tenant.retellAgentId || 'NOT CREATED'}`);
      console.log(`   Tenant ID: ${tenant.id}`);
      console.log('');

      // Status for manual setup
      if (tenant.twilioNumber && tenant.retellAgentId) {
        console.log('   📋 MANUAL SETUP REQUIRED:');
        console.log(`      1. Go to Retell Dashboard`);
        console.log(`      2. Add Phone Number: ${tenant.twilioNumber}`);
        console.log(`      3. Select Agent: ${tenant.retellAgentId}`);
        console.log(`      4. Update Twilio webhook\n`);
      } else if (!tenant.twilioNumber) {
        console.log('   ⚠️  Twilio phone number required!\n');
      } else if (!tenant.retellAgentId) {
        console.log('   ⚠️  Retell agent needs to be created!\n');
      }
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log('📖 Detailed instructions: RETELL_MANUAL_SETUP.md\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listTenants();
