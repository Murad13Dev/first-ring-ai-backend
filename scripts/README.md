# Test Məlumatlarını Təmizləmə Skripti

## İstifadə

Test məlumatlarını təmizləmək üçün:

```bash
npm run cleanup
```

və ya birbaşa:

```bash
ts-node scripts/cleanup-test-data.ts
```

## Nə silinir?

Bu skript aşağıdakı bütün məlumatları silir:

- ✅ **Tenant-lar** və onların istifadəçiləri
- ✅ **Lead-lər** (potensial müştərilər)
- ✅ **Booking-lər** (rezervasiyalar)
- ✅ **Order-lər** (sifarişlər)
- ✅ **Call-lar** (zəng qeydləri)
- ✅ **Service-lər** (xidmətlər/menyular)
- ✅ **FAQ-lar**
- ✅ **Customer-lər** (müştəri məlumatları)
- ✅ **ChatSession** və **ChatMessage-lar**
- ✅ **Invoice** və **InvoiceItem-lər**
- ✅ **Subscription-lar**
- ✅ **Product-lar** və **MenuItem-lər**
- ✅ **Promotion-lar**
- ✅ **QRCode-lar**
- ✅ **Message-lar**
- ✅ **Callback-lar**
- ✅ **FollowUp** məlumatları
- ✅ **UsageRecord-lar**
- ✅ **Notification-lar**
- ✅ **AnalyticsEvent-lər**
- ✅ **ActivityLog-lar**
- ✅ **AdminUser-lər**
- ✅ **BusinessTypeFunction-lar**

## Nə saxlanılır?

Aşağıdakı sistem məlumatları **saxlanılır**:

- 🔒 **BusinessType-lar** (restaurant, hotel, medical, və s.)
- 🔒 **Plan-lar** (Starter, Professional, Enterprise)

### Əgər bunları da silmək istəyirsinizsə:

`scripts/cleanup-test-data.ts` faylını açın və aşağıdakı sətirləri aktiv edin:

```typescript
// await prisma.businessType.deleteMany({});
// await prisma.plan.deleteMany({});
```

## Təhlükəsizlik

- ⚠️ **Production mühitində** skript işləməyəcək (NODE_ENV=production)
- ✅ Yalnız **development** mühitində işləyir
- 📊 Skript əvvəl və sonra statistika göstərir

## Nümunə çıxış

```
🧹 Test məlumatlarını təmizləməyə başlayırıq...

📊 Əvvəlki vəziyyət:
   📦 Tenant              : 3
   📦 User                : 5
   📦 Booking             : 12
   ...

🗑️  Məlumatları silməyə başlayırıq...

1️⃣  InvoiceItem-ləri silik...
   ✅ Tamamlandı
...

📊 Yeni vəziyyət:
   ✅ Tenant              : 0
   ✅ User                : 0
   ✅ Booking             : 0
   ...

✅ Test məlumatları uğurla təmizləndi!
```

## Xəbərdarlıq

⚠️ **Bu əməliyyat geri qaytarıla bilməz!** Məlumatları silməzdən əvvəl əmin olun ki, backup aldınız.

## Verilənlər bazasını sıfırdan qurmaq

Əgər verilənlər bazasını tamamilə sıfırdan qurmaq istəyirsinizsə:

```bash
# 1. Verilənlər bazasını sıfırla
npm run prisma:migrate:reset

# 2. Sistem məlumatlarını yüklə (BusinessTypes və Plans)
# Backend-i işə salın və bu endpoint-ləri çağırın:
# POST /api/business-types/seed
# POST /api/subscriptions/plans/seed
```
