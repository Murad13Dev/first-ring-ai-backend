import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
  console.log('🧹 Test məlumatlarını təmizləməyə başlayırıq...\n');

  try {
    // Əvvəlcə statistika göstərək
    console.log('📊 Əvvəlki vəziyyət:');
    await showStats();
    console.log('\n');

    // Əminlik üçün təsdiq tələb edək (production-da)
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  XƏBƏRDARLIQ: Production mühitində işləyirsiniz!');
      console.log('Bu əməliyyat bütün test məlumatlarını silir.');
      console.log('Davam etmək üçün NODE_ENV=development təyin edin.\n');
      process.exit(1);
    }

    console.log('🗑️  Məlumatları silməyə başlayırıq...\n');

    // 1. İlk öncə child record-ları siləlim
    console.log('1️⃣  InvoiceItem-ləri silik...');
    await prisma.invoiceItem.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣  Invoice-ləri silik...');
    await prisma.invoice.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('3️⃣  BusinessTypeFunction-ları silik...');
    await prisma.businessTypeFunction.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('4️⃣  UsageRecord-ları silik...');
    await prisma.usageRecord.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('5️⃣  Notification-ları silik...');
    await prisma.notification.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('6️⃣  AnalyticsEvent-ləri silik...');
    await prisma.analyticsEvent.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('7️⃣  ChatMessage-ları silik...');
    await prisma.chatMessage.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('8️⃣  ChatSession-ları silik...');
    await prisma.chatSession.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('9️⃣  FollowUpJob-ları silik...');
    await prisma.followUpJob.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('🔟 FollowUpConfig-ləri silik...');
    await prisma.followUpConfig.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣1️⃣ QRCode-ları silik...');
    await prisma.qRCode.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣2️⃣ Callback-ları silik...');
    await prisma.callback.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣3️⃣ Message-ları silik...');
    await prisma.message.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣4️⃣ CallLog-ları silik...');
    await prisma.callLog.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣5️⃣ Product-ları silik...');
    await prisma.product.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣6️⃣ MenuItem-ləri silik...');
    await prisma.menuItem.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣7️⃣ Promotion-ları silik...');
    await prisma.promotion.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣8️⃣ Customer-ləri silik...');
    await prisma.customer.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('1️⃣9️⃣ Call-ları silik...');
    await prisma.call.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣0️⃣ Order-ləri silik...');
    await prisma.order.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣1️⃣ Booking-ləri silik...');
    await prisma.booking.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣2️⃣ FAQ-ları silik...');
    await prisma.fAQ.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣3️⃣ Service-ləri silik...');
    await prisma.service.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣4️⃣ Subscription-ları silik...');
    await prisma.subscription.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣5️⃣ User-ləri silik...');
    await prisma.user.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣6️⃣ Tenant-ları silik...');
    await prisma.tenant.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣7️⃣ ActivityLog-ları silik...');
    await prisma.activityLog.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣8️⃣ Lead-ləri silik...');
    await prisma.lead.deleteMany({});
    console.log('   ✅ Tamamlandı');

    console.log('2️⃣9️⃣ AdminUser-ləri silik...');
    await prisma.adminUser.deleteMany({});
    console.log('   ✅ Tamamlandı');

    // BusinessType və Plan-ları saxlayırıq (sistem məlumatları)
    console.log('\n💡 Qeyd: BusinessType və Plan saxlanılır (sistem məlumatları)');
    console.log('   Əgər bunları da silmək istəyirsinizsə, aşağıdakı kodu açın:\n');
    console.log('   // await prisma.businessType.deleteMany({});');
    console.log('   // await prisma.plan.deleteMany({});\n');

    // Nəticəni göstərək
    console.log('\n📊 Yeni vəziyyət:');
    await showStats();

    console.log('\n✅ Test məlumatları uğurla təmizləndi!');
  } catch (error) {
    console.error('\n❌ Xəta baş verdi:', error);
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

// Əgər birbaşa çalışdırılırsa
if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('\n👋 Script tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal xəta:', error);
      process.exit(1);
    });
}

export { cleanupTestData };
