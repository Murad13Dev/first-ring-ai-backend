/**
 * Email Service Test Script
 * Run this to test email sending functionality
 *
 * Usage:
 * npx ts-node src/modules/email/email.test.ts
 */

import { emailService } from './email.service';

async function testPricingEmail() {
  console.log('🧪 Testing Pricing Packages Email...\n');

  try {
    const result = await emailService.sendPricingPackages({
      to: process.env.TEST_EMAIL || 'test@example.com',
      customerName: 'Dr. Sarah Johnson',
      businessType: 'dental',
      recommendedPlan: 'professional',
    });

    console.log('✅ Pricing email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('\nCheck your inbox at:', process.env.TEST_EMAIL || 'test@example.com');
  } catch (error) {
    console.error('❌ Error sending pricing email:', error);
    console.error('\nMake sure your .env file has:');
    console.error('  SMTP_HOST=smtp.gmail.com');
    console.error('  SMTP_PORT=587');
    console.error('  SMTP_USER=your-email@gmail.com');
    console.error('  SMTP_PASSWORD=your-app-password');
  }
}

async function testDemoConfirmation() {
  console.log('\n🧪 Testing Demo Confirmation Email...\n');

  try {
    const result = await emailService.sendDemoConfirmation({
      to: process.env.TEST_EMAIL || 'test@example.com',
      customerName: 'John Smith',
      date: '2024-02-15',
      time: '14:00',
      timezone: 'America/New_York',
    });

    console.log('✅ Demo confirmation email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('\nCheck your inbox at:', process.env.TEST_EMAIL || 'test@example.com');
  } catch (error) {
    console.error('❌ Error sending demo confirmation:', error);
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('  EMAIL SERVICE TEST                           ');
  console.log('═══════════════════════════════════════════════\n');

  // Check if SMTP settings are configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('⚠️  WARNING: SMTP settings not configured!\n');
    console.error('Please set these in your .env file:');
    console.error('  SMTP_HOST=smtp.gmail.com');
    console.error('  SMTP_PORT=587');
    console.error('  SMTP_USER=your-email@gmail.com');
    console.error('  SMTP_PASSWORD=your-app-password');
    console.error('  TEST_EMAIL=recipient@example.com\n');
    process.exit(1);
  }

  console.log('📧 SMTP Configuration:');
  console.log(`  Host: ${process.env.SMTP_HOST}`);
  console.log(`  Port: ${process.env.SMTP_PORT}`);
  console.log(`  User: ${process.env.SMTP_USER}`);
  console.log(`  Test Email: ${process.env.TEST_EMAIL || 'test@example.com'}\n`);
  console.log('═══════════════════════════════════════════════\n');

  // Run tests
  await testPricingEmail();
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
  await testDemoConfirmation();

  console.log('\n═══════════════════════════════════════════════');
  console.log('  TESTS COMPLETED                              ');
  console.log('═══════════════════════════════════════════════\n');
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
