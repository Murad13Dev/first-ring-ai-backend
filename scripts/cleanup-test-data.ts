import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...\n');

  try {
    // Show statistics first
    console.log('📊 Current state:');
    await showStats();
    console.log('\n');

    // Ask for confirmation (for production)
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  WARNING: Running in production environment!');
      console.log('This operation will delete all test data.');
      console.log('Set NODE_ENV=development to continue.\n');
      process.exit(1);
    }

    console.log('🗑️  Deleting data...\n');

    // 1. First delete child records
    console.log('1️⃣  Deleting InvoiceItems...');
    await prisma.invoiceItem.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣  Deleting Invoices...');
    await prisma.invoice.deleteMany({});
    console.log('   ✅ Completed');

    console.log('3️⃣  Deleting BusinessTypeFunctions...');
    await prisma.businessTypeFunction.deleteMany({});
    console.log('   ✅ Completed');

    console.log('4️⃣  Deleting UsageRecords...');
    await prisma.usageRecord.deleteMany({});
    console.log('   ✅ Completed');

    console.log('5️⃣  Deleting Notifications...');
    await prisma.notification.deleteMany({});
    console.log('   ✅ Completed');

    console.log('6️⃣  Deleting AnalyticsEvents...');
    await prisma.analyticsEvent.deleteMany({});
    console.log('   ✅ Completed');

    console.log('7️⃣  Deleting ChatMessages...');
    await prisma.chatMessage.deleteMany({});
    console.log('   ✅ Completed');

    console.log('8️⃣  Deleting ChatSessions...');
    await prisma.chatSession.deleteMany({});
    console.log('   ✅ Completed');

    console.log('9️⃣  Deleting FollowUpJobs...');
    await prisma.followUpJob.deleteMany({});
    console.log('   ✅ Completed');

    console.log('🔟 Deleting FollowUpConfigs...');
    await prisma.followUpConfig.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣1️⃣ Deleting QRCodes...');
    await prisma.qRCode.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣2️⃣ Deleting Callbacks...');
    await prisma.callback.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣3️⃣ Deleting Messages...');
    await prisma.message.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣4️⃣ Deleting CallLogs...');
    await prisma.callLog.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣5️⃣ Deleting Products...');
    await prisma.product.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣6️⃣ Deleting MenuItems...');
    await prisma.menuItem.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣7️⃣ Deleting Promotions...');
    await prisma.promotion.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣8️⃣ Deleting Customers...');
    await prisma.customer.deleteMany({});
    console.log('   ✅ Completed');

    console.log('1️⃣9️⃣ Deleting Calls...');
    await prisma.call.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣0️⃣ Deleting Orders...');
    await prisma.order.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣1️⃣ Deleting Bookings...');
    await prisma.booking.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣2️⃣ Deleting FAQs...');
    await prisma.fAQ.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣3️⃣ Deleting Services...');
    await prisma.service.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣4️⃣ Deleting Subscriptions...');
    await prisma.subscription.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣5️⃣ Deleting Users...');
    await prisma.user.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣6️⃣ Deleting Tenants...');
    await prisma.tenant.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣7️⃣ Deleting ActivityLogs...');
    await prisma.activityLog.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣8️⃣ Deleting Leads...');
    await prisma.lead.deleteMany({});
    console.log('   ✅ Completed');

    console.log('2️⃣9️⃣ Deleting AdminUsers...');
    await prisma.adminUser.deleteMany({});
    console.log('   ✅ Completed');

    // Keep BusinessType and Plan (system data)
    console.log('\n💡 Note: BusinessType and Plan are preserved (system data)');
    console.log('   To delete these as well, uncomment the following lines:\n');
    console.log('   // await prisma.businessType.deleteMany({});');
    console.log('   // await prisma.plan.deleteMany({});\n');

    // Show results
    console.log('\n📊 New state:');
    await showStats();

    console.log('\n✅ Test data cleaned successfully!');
  } catch (error) {
    console.error('\n❌ Error occurred:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function showStats() {
  const stats = {
    Tenant: await prisma.tenant.count(),
    User: await prisma.user.count(),
    AdminUser: await prisma.adminUser.count(),
    Lead: await prisma.lead.count(),
    Service: await prisma.service.count(),
    FAQ: await prisma.fAQ.count(),
    Booking: await prisma.booking.count(),
    Order: await prisma.order.count(),
    Call: await prisma.call.count(),
    Customer: await prisma.customer.count(),
    ChatSession: await prisma.chatSession.count(),
    ChatMessage: await prisma.chatMessage.count(),
    CallLog: await prisma.callLog.count(),
    Product: await prisma.product.count(),
    MenuItem: await prisma.menuItem.count(),
    Promotion: await prisma.promotion.count(),
    QRCode: await prisma.qRCode.count(),
    Message: await prisma.message.count(),
    Callback: await prisma.callback.count(),
    FollowUpConfig: await prisma.followUpConfig.count(),
    FollowUpJob: await prisma.followUpJob.count(),
    Subscription: await prisma.subscription.count(),
    UsageRecord: await prisma.usageRecord.count(),
    Invoice: await prisma.invoice.count(),
    InvoiceItem: await prisma.invoiceItem.count(),
    Notification: await prisma.notification.count(),
    AnalyticsEvent: await prisma.analyticsEvent.count(),
    ActivityLog: await prisma.activityLog.count(),
    BusinessType: await prisma.businessType.count(),
    BusinessTypeFunction: await prisma.businessTypeFunction.count(),
    Plan: await prisma.plan.count(),
  };

  const maxLabelLength = Math.max(...Object.keys(stats).map(k => k.length));

  for (const [model, count] of Object.entries(stats)) {
    const label = model.padEnd(maxLabelLength);
    const icon = count > 0 ? '📦' : '✅';
    console.log(`   ${icon} ${label}: ${count}`);
  }
}

// If running directly
if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('\n👋 Script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { cleanupTestData };
