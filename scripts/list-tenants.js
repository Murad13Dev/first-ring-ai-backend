#!/usr/bin/env node

/**
 * Tenant məlumatlarını göstərir (manual setup üçün)
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
    console.log('║          RETELL AI MANUAL SETUP - TENANT SİYAHISI             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (tenants.length === 0) {
      console.log('❌ Heç bir tenant tapılmadı.\n');
      console.log('Yeni tenant yaratmaq üçün:');
      console.log('  POST /api/tenants/create\n');
      return;
    }

    console.log(`📊 Cəmi ${tenants.length} tenant tapıldı:\n`);

    tenants.forEach((tenant, index) => {
      const hasPhone = tenant.twilioNumber ? '✅' : '❌';
      const hasAgent = tenant.retellAgentId ? '✅' : '❌';

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   Business Type: ${tenant.businessType}`);
      console.log(`   ${hasPhone} Twilio Number: ${tenant.twilioNumber || 'YET YOXDUR'}`);
      console.log(`   ${hasAgent} Retell Agent: ${tenant.retellAgentId || 'YET YARADILMAYIB'}`);
      console.log(`   Tenant ID: ${tenant.id}`);
      console.log('');

      // Manual setup üçün status
      if (tenant.twilioNumber && tenant.retellAgentId) {
        console.log('   📋 MANUAL SETUP LAZIMDIR:');
        console.log(`      1. Retell Dashboard-a get`);
        console.log(`      2. Phone Number əlavə et: ${tenant.twilioNumber}`);
        console.log(`      3. Agent seç: ${tenant.retellAgentId}`);
        console.log(`      4. Twilio webhook yenilə\n`);
      } else if (!tenant.twilioNumber) {
        console.log('   ⚠️  Twilio phone number lazımdır!\n');
      } else if (!tenant.retellAgentId) {
        console.log('   ⚠️  Retell agent yaratmaq lazımdır!\n');
      }
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log('📖 Ətraflı təlimat: RETELL_MANUAL_SETUP.md\n');

  } catch (error) {
    console.error('❌ Xəta:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listTenants();
