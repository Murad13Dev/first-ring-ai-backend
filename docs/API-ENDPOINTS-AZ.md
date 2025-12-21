# 🚀 FIRST RING AI - BÜTÜN API ENDPOINT-LƏR (Yenilənmiş)

**Ümumi Backend URL:** `https://your-domain.com/api`

**Versiya:** 2.1.0
**Son Yenilənmə:** 2024-12-21
**Ümumi Endpoint Sayı:** 165+

> 🆕 **v2.1.0 Yenilikləri:** Tenant module partial updates, language management, email improvements, və status validation əlavə edildi!

---

## 📑 MÜNDƏRİCAT

1. [Authentication (Auth)](#1-authentication-auth)
2. [Leads Management](#2-leads-management)
3. [Retell AI](#3-retell-ai)
4. [Bookings (Rezervasiyalar)](#4-bookings-rezervasiyalar)
5. [Orders (Sifarişlər)](#5-orders-sifarişlər)
6. [Services (Xidmətlər/Menyu)](#6-services-xidmətlər--menyu)
7. [FAQs (Sual-Cavab)](#7-faqs-sual-cavab)
8. [Calls (Zəng Logları)](#8-calls-zəng-logları)
9. [Tenants (Müştərilər)](#9-tenants-müştərilər)
10. [Business Types](#10-business-types)
11. [Integrations (Google, Square)](#11-integrations)
12. [Subscriptions (Abunələr)](#12-subscriptions)
13. [Dashboards](#13-dashboards)
14. [Analytics](#14-analytics)
15. [Notifications](#15-notifications)
16. [Follow-ups](#16-follow-ups)
17. [Channels](#17-channels)
18. [POS Integrations](#18-pos-integrations)
19. [AI Agent](#19-ai-agent)

---

## 1. AUTHENTICATION (AUTH)

**Base:** `/api/auth`

### Tenant İstifadəçiləri

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/register` | POST | ❌ | Yeni istifadəçi qeydiyyatı |
| `/login` | POST | ❌ | İstifadəçi girişi |
| `/logout` | POST | ✅ Bearer | Çıxış |
| `/refresh` | POST | ❌ | Access token yeniləmə |
| `/me` | GET | ✅ Bearer | Cari istifadəçi məlumatı |
| `/verify-email/:token` | GET | ❌ | Email təsdiqləmə |
| `/resend-verification` | POST | ❌ | Təsdiq emaili yenidən göndər |

### Admin

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/admin/login` | POST | ❌ | Admin girişi |

**Nümunə - Login:**
```bash
POST /api/auth/login
{
  "email": "owner@restaurant.az",
  "password": "SecurePass123!"
}

# Cavab:
{
  "success": true,
  "data": {
    "user": {...},
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

## 2. LEADS MANAGEMENT

**Base:** `/api/leads`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | POST | ❌ | Lead yaratma (web form, AI zəng) |
| `/` | GET | ✅ Admin | Bütün lead-lər (filter, pagination) |
| `/stats` | GET | ✅ Admin | Lead statistikaları |
| `/:id` | GET | ✅ Admin | Lead detalları |
| `/:id` | PUT | ✅ Admin | Lead yeniləmə (status, notes) |
| `/:id/convert` | POST | ✅ Admin | Lead-i tenant-a çevir |

**Nümunə - Web Formdan Lead:**
```bash
POST /api/leads
{
  "source": "landing_page_form",
  "contactName": "John Smith",
  "email": "john@restaurant.com",
  "phone": "+1234567890",
  "businessName": "Pizza House",
  "businessType": "restaurant",
  "selectedPlan": "pro",
  "address": "North America, USA",
  "urgency": "immediate"
}
```

**Nümunə - Lead Convert:**
```bash
POST /api/leads/lead_abc123/convert
Authorization: Bearer {admin_token}

# Tenant və User account yaradılır
# Temporary password göndərilir
```

---

## 3. RETELL AI

**Base:** `/api/retell`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/webhook` | POST | ❌ | Retell AI webhook (call events) |
| `/functions/general` | POST | ❌ | Platform funksiyaları (sales agent) |
| `/functions/:tenantId` | POST | ❌ | Tenant funksiyaları (restaurant, retail, və s.) |
| `/functions/:tenantId/available` | GET | ❌ | Mövcud funksiyalar siyahısı |

**Sales Agent Functions (general):**
- `create_sales_lead` - Lead yaratma
- `send_pricing_packages` - Qiymət emaili göndərmə
- `schedule_demo` - Demo təyin etmə
- `check_feature_availability` - Feature yoxlama
- `get_pricing_plans` - Qiymət planları
- `get_features` - Feature siyahısı
- `get_business_types` - Biznes tipləri

**Restaurant Functions (tenantId):**
- `check_availability` - Masa yoxlama
- `create_reservation` - Rezervasiya yaratma
- `cancel_reservation` - Rezervasiya ləğvi
- `get_menu` - Menyu
- `create_order` - Sifariş qəbulu
- `get_hours` - İş saatları
- `get_specials` - Günün speşlləri

**Nümunə - Sales Agent:**
```bash
POST /api/retell/functions/general
{
  "function_name": "create_sales_lead",
  "args": {
    "name": "Dr. Sarah",
    "email": "sarah@dental.com",
    "businessName": "Smile Dental",
    "businessType": "dental"
  }
}
```

---

## 4. BOOKINGS (REZERVASIYALAR)

**Base:** `/api/bookings`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | POST | ✅ Tenant | Yeni booking yaratma |
| `/` | GET | ✅ Tenant | Bookings siyahısı (filter, pagination) |
| `/availability` | GET | ✅ Tenant | Mövcudluq yoxlama |
| `/slots` | GET | ✅ Tenant | Boş vaxt slotları |
| `/stats` | GET | ✅ Tenant | Booking statistikaları |
| `/:id` | GET | ✅ Tenant | Booking detalları |
| `/:id` | PUT | ✅ Tenant | Booking yeniləmə |
| `/:id/confirm` | POST | ✅ Tenant | Booking təsdiqi |
| `/:id/cancel` | POST | ✅ Tenant | Booking ləğvi |
| `/:id/no-show` | POST | ✅ Tenant | No-show qeyd etmə |

**Nümunə - Reservation:**
```bash
POST /api/bookings
Authorization: Bearer {tenant_token}
{
  "customerName": "Əli Məmmədov",
  "customerPhone": "+994501234567",
  "customerEmail": "ali@example.com",
  "serviceName": "Masa Rezervasiyası",
  "dateTime": "2024-02-15T19:00:00Z",
  "partySize": 4,
  "notes": "Pəncərə yanı"
}
```

---

## 5. ORDERS (SİFARİŞLƏR)

**Base:** `/api/orders`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | POST | ✅ Tenant | Yeni sifariş yaratma |
| `/` | GET | ✅ Tenant | Sifarişlər siyahısı |
| `/stats` | GET | ✅ Tenant | Sifariş statistikaları |
| `/:id` | GET | ✅ Tenant | Sifariş detalları |
| `/:id` | PUT | ✅ Tenant | Sifariş yeniləmə (status) |
| `/:id/checkout` | POST | ✅ Tenant | Checkout link yaratma (Stripe) |

**Nümunə - Order:**
```bash
POST /api/orders
Authorization: Bearer {tenant_token}
{
  "customerName": "Vüqar Həsənov",
  "customerPhone": "+994551234567",
  "items": [
    {
      "itemId": "item_123",
      "name": "Pizza Marqarita",
      "quantity": 2,
      "price": 12.50
    }
  ],
  "deliveryType": "delivery",
  "deliveryAddress": "Nizami küç. 123, Bakı",
  "subtotal": 25.00,
  "tax": 2.50,
  "total": 27.50
}
```

---

## 6. SERVICES (XİDMƏTLƏR / MENYU)

**Base:** `/api/services`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | POST | ✅ Tenant | Yeni xidmət/menyu əlavə et |
| `/` | GET | ✅ Tenant | Xidmətlər siyahısı |
| `/:id` | GET | ✅ Tenant | Xidmət detalları |
| `/:id` | PUT | ✅ Tenant | Xidmət yeniləmə |
| `/:id` | DELETE | ✅ Tenant | Xidmət silinməsi |
| `/categories/list` | GET | ✅ Tenant | Kateqoriya siyahısı |
| `/stock/low` | GET | ✅ Tenant | Az stoklu məhsullar |
| `/bulk/availability` | PUT | ✅ Tenant | Toplu mövcudluq yeniləmə |
| `/:id/stock` | PUT | ✅ Tenant | Stok yeniləmə |
| `/:id/duplicate` | POST | ✅ Tenant | Xidmət kopyalama |

**Nümunə - Restaurant Menu Item:**
```bash
POST /api/services
Authorization: Bearer {tenant_token}
{
  "name": "Pizza Marqarita",
  "description": "Klassik italyan pizzası",
  "price": 12.50,
  "category": "Pizza",
  "duration": 25,
  "quantity": 50,
  "isAvailable": true
}
```

---

## 7. FAQS (SUAL-CAVAB)

**Base:** `/api/faqs`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | POST | ✅ Tenant | Yeni FAQ əlavə et |
| `/` | GET | ✅ Tenant | FAQ siyahısı |
| `/search` | POST | ❌ | FAQ axtarışı (AI üçün) |
| `/categories/list` | GET | ✅ Tenant | Kateqoriya siyahısı |
| `/stats` | GET | ✅ Tenant | FAQ statistikaları |
| `/:id` | GET | ✅ Tenant | FAQ detalları |
| `/:id` | PUT | ✅ Tenant | FAQ yeniləmə |
| `/:id` | DELETE | ✅ Tenant | FAQ silinməsi |
| `/:id/helpful` | POST | ❌ | "Faydalı" qeyd etmə |

**Nümunə - FAQ Search (AI):**
```bash
POST /api/faqs/search
{
  "tenantId": "tenant_abc123",
  "query": "İş saatlarınız nədir?"
}

# Cavab:
{
  "success": true,
  "data": {
    "question": "İş saatlarımız",
    "answer": "Biz həftə içi 10:00-22:00, həftəsonu 12:00-23:00 işləyirik.",
    "confidence": 0.95
  }
}
```

---

## 8. CALLS (ZƏNG LOQLARI)

**Base:** `/api/calls`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | POST | ❌ | Zəng loqu yaratma (Twilio webhook) |
| `/` | GET | ✅ Tenant | Zənglər siyahısı |
| `/stats` | GET | ✅ Tenant | Zəng statistikaları |
| `/:id` | GET | ✅ Tenant | Zəng detalları (transcript, recording) |

**Nümunə - Call Stats:**
```bash
GET /api/calls/stats?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {tenant_token}

# Cavab:
{
  "totalCalls": 145,
  "inbound": 120,
  "outbound": 25,
  "avgDuration": 180,
  "intents": {
    "booking": 65,
    "order": 40,
    "faq": 35,
    "escalation": 5
  }
}
```

---

## 9. TENANTS (MÜŞTƏRİLƏR)

**Base:** `/api/tenants`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | POST | ✅ Admin | Yeni tenant yaratma |
| `/` | GET | ✅ Admin | Bütün tenantlar (filter, pagination) |
| `/:id` | GET | ✅ Tenant | Tenant detalları |
| `/:id` | PUT | ✅ Tenant | Tenant yeniləmə (validation ilə) |
| `/:id` | DELETE | ✅ Admin | Tenant deaktiv etmə |
| `/:id/stats` | GET | ✅ Tenant | Tenant statistikaları |
| `/stats/all` | GET | ✅ Admin | Bütün tenantların statistikası |
| `/:id/subscription` | PUT | ✅ Admin | Abunə yeniləmə (partial update) |
| `/languages` | GET | ✅ Tenant | Dəstəklənən dillər |
| `/languages/test` | POST | ✅ Tenant | Translation test |
| `/:id/language` | PUT | ✅ Tenant | Tenant dilini təyin et |

### Tenant Info
**Nümunə - Tenant Məlumatı:**
```bash
GET /api/tenants/tenant_abc123
Authorization: Bearer {tenant_token}

# Cavab:
{
  "id": "tenant_abc123",
  "name": "Pizza Palace",
  "businessType": "restaurant",
  "email": "info@pizzapalace.az",
  "phone": "+994123456789",
  "twilioNumber": "+1234567890",
  "subscriptionStatus": "active",
  "plan": "pro",
  "settings": {
    "defaultLanguage": "az"
  }
}
```

### Tenant Update
**Nümunə - Tenant Update:**
```bash
PUT /api/tenants/tenant_abc123
Authorization: Bearer {tenant_token}
{
  "name": "Pizza Palace Premium",
  "phone": "+994557654321",
  "subscriptionStatus": "active",
  "plan": "enterprise"
}

# Validation:
# - subscriptionStatus: trial, active, cancelled, suspended
# - plan: free, basic, pro, enterprise
# - Səhv status göndərsəniz aydın error mesajı alırsınız

# Cavab:
{
  "success": true,
  "message": "Tenant updated successfully",
  "data": {
    "id": "tenant_abc123",
    "name": "Pizza Palace Premium",
    "subscriptionStatus": "active",
    "plan": "enterprise",
    ...
  }
}
```

### Subscription Update (Partial)
**ÖNƏMLİ:** Artıq subscription update zamanı bütün field-lər lazım deyil!

```bash
PUT /api/tenants/tenant_abc123/subscription
Authorization: Bearer {admin_token}

# Yalnız status dəyişdirmək:
{
  "subscriptionStatus": "active"
}

# Yalnız plan dəyişdirmək:
{
  "plan": "pro"
}

# Hər ikisini dəyişdirmək:
{
  "subscriptionStatus": "active",
  "plan": "enterprise"
}

# Frontend compatibility - həm 'subscriptionStatus' həm 'status' işləyir:
{
  "status": "active"  // ✅ İşləyir
}

# Valid Subscription Statuses:
# - trial: Sınaq dövründə
# - active: Aktiv abunə (ödəniş lazım deyil!)
# - cancelled: Ləğv edilmiş
# - suspended: Dayandırılmış

# Valid Plans:
# - free: Pulsuz
# - basic: Əsas
# - pro: Professional
# - enterprise: Korporativ

# Cavab:
{
  "success": true,
  "message": "Subscription updated successfully",
  "data": {
    "id": "tenant_abc123",
    "subscriptionStatus": "active",
    "plan": "pro",
    ...
  }
}

# Error Nümunəsi (səhv status):
{
  "success": false,
  "message": "Invalid subscription status. Must be one of: trial, active, cancelled, suspended",
  "providedStatus": "Active"
}
```

### Language Update
**Nümunə - Dil Dəyişdirmə:**
```bash
PUT /api/tenants/tenant_abc123/language
Authorization: Bearer {tenant_token}
{
  "language": "az"
}

# Dəstəklənən dillər:
# - az: Azərbaycan dili
# - en: English
# - tr: Türkçe
# - ru: Русский
# - es: Español
# - zh: 中文

# Cavab:
{
  "success": true,
  "message": "Language updated successfully",
  "data": {
    "language": "az",
    "settings": {
      "defaultLanguage": "az"
    }
  }
}

# Language settings.defaultLanguage kimi saxlanılır
```

---

## 10. BUSINESS TYPES

**Base:** `/api/business-types`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | GET | ❌ | Biznes tipləri siyahısı |
| `/slug/:slug` | GET | ❌ | Biznes tipi detalları (slug ilə) |
| `/:id` | GET | ❌ | Biznes tipi detalları (ID ilə) |
| `/` | POST | ✅ Admin | Yeni biznes tipi əlavə |
| `/:id` | PUT | ✅ Admin | Biznes tipi yeniləmə |
| `/:id` | DELETE | ✅ Admin | Biznes tipi silinməsi |
| `/slug/:slug/functions` | GET | ❌ | Biznes tipi funksiyaları |
| `/:id/functions` | POST | ✅ Admin | Funksiya əlavə etmə |
| `/functions/:functionId` | PUT | ✅ Admin | Funksiya yeniləmə |
| `/functions/:functionId` | DELETE | ✅ Admin | Funksiya silinməsi |
| `/seed` | POST | ✅ Admin | Default tipləri əlavə et |

**Mövcud Business Types:**
- Restaurant
- Retail Store
- Medical/Dental
- Hotel
- Salon/Spa
- Real Estate

---

## 11. INTEGRATIONS

**Base:** `/api/integrations`

### Google Sheets

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/sheets/auth` | GET | ✅ Tenant | Google OAuth başlat |
| `/sheets/callback` | GET | ❌ | OAuth callback |
| `/sheets/spreadsheet` | POST | ✅ Tenant | Spreadsheet yaratma |
| `/sheets/export/calls` | GET | ✅ Tenant | Zəngləri export et |
| `/sheets/export/bookings` | GET | ✅ Tenant | Bookingləri export et |
| `/sheets/export/orders` | GET | ✅ Tenant | Sifarişləri export et |
| `/sheets/disconnect` | DELETE | ✅ Tenant | Google disconnect |

### Google Calendar

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/calendar/auth` | GET | ✅ Tenant | Google Calendar OAuth |
| `/calendar/list` | GET | ✅ Tenant | Calendarlar siyahısı |
| `/calendar/event` | POST | ✅ Tenant | Event yaratma |
| `/calendar/upcoming` | GET | ✅ Tenant | Yaxınlaşan eventlər |
| `/calendar/sync` | POST | ✅ Tenant | Bütün bookingləri sync et |
| `/calendar/disconnect` | DELETE | ✅ Tenant | Calendar disconnect |

**Nümunə - Calendar Sync:**
```bash
POST /api/integrations/calendar/sync
Authorization: Bearer {tenant_token}

# Bütün pending bookingləri Google Calendar-a sync edir
```

---

## 12. SUBSCRIPTIONS

**Base:** `/api/subscriptions`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/plans` | GET | ❌ | Subscription planları |
| `/plans/seed` | POST | ✅ Admin | Default planları əlavə et |
| `/` | POST | ✅ Tenant | Yeni subscription yaratma |
| `/:tenantId` | GET | ✅ Tenant | Subscription detalları |
| `/:tenantId` | PUT | ✅ Admin | Subscription yeniləmə |
| `/:tenantId/cancel` | POST | ✅ Tenant | Subscription ləğvi |

**Plans:**
- Starter: $49/month - 100 dəq
- Professional: $149/month - 500 dəq
- Enterprise: $499/month - 2000 dəq

---

## 13. DASHBOARDS

### Customer Dashboard

**Base:** `/api/dashboard`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/:tenantId/overview` | GET | ✅ Tenant | Tenant overview (stats) |
| `/:tenantId/calls` | GET | ✅ Tenant | Zəng tarixi |
| `/:tenantId/calls/analytics` | GET | ✅ Tenant | Zəng analytics |
| `/:tenantId/usage` | GET | ✅ Tenant | Usage history |
| `/:tenantId/invoices` | GET | ✅ Tenant | İnvoice siyahısı |
| `/:tenantId/notifications` | GET | ✅ Tenant | Bildirişlər |
| `/notifications/:notificationId/read` | PUT | ✅ Tenant | Bildirişi oxundu et |
| `/:tenantId/activities` | GET | ✅ Tenant | Son aktivliklər |

### Admin Dashboard

**Base:** `/api/admin`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/overview` | GET | ✅ Admin | Platform stats |
| `/tenants` | GET | ✅ Admin | Bütün tenantlar (search, filter) |
| `/tenants/:tenantId` | GET | ✅ Admin | Tenant detalları |
| `/tenants/:tenantId/status` | PUT | ✅ Admin | Tenant statusu dəyiş |
| `/analytics/revenue` | GET | ✅ Admin | Revenue analytics |
| `/analytics/calls` | GET | ✅ Admin | Call analytics |
| `/analytics/subscriptions` | GET | ✅ Admin | Subscription analytics |
| `/activities` | GET | ✅ Admin | Platform aktivlikləri |
| `/users/pending-approval` | GET | ✅ Admin | Təsdiq gözləyən istifadəçilər |
| `/users/:userId/approve` | POST | ✅ Admin | İstifadəçini təsdiq et |
| `/users/:userId/reject` | POST | ✅ Admin | İstifadəçini rədd et |

**Nümunə - Tenant Overview:**
```bash
GET /api/dashboard/tenant_123/overview
Authorization: Bearer {tenant_token}

# Cavab:
{
  "subscription": {
    "plan": "Professional",
    "status": "active"
  },
  "stats": {
    "callsThisMonth": 145,
    "bookingsThisMonth": 68,
    "ordersThisMonth": 42
  },
  "usage": {
    "callMinutes": 450,
    "callMinutesLimit": 500,
    "callCount": 145,
    "callCountLimit": 1000
  }
}
```

---

## 14. ANALYTICS

**Base:** `/api/analytics`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/track` | POST | ❌ | Event tracking |
| `/platform` | GET | ✅ Admin | Platform analytics |
| `/:tenantId` | GET | ✅ Tenant | Tenant analytics (aggregated) |
| `/:tenantId/events` | GET | ✅ Tenant | Event siyahısı |

**Tracked Events:**
- `call_completed`
- `booking_created`
- `order_placed`
- `lead_created`
- `demo_scheduled`

---

## 15. NOTIFICATIONS

**Base:** `/api/notifications`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | POST | ✅ Admin | Notification yaratma |
| `/:tenantId` | GET | ✅ Tenant | Bildirişlər siyahısı |
| `/:id/read` | PUT | ✅ Tenant | Oxundu qeyd et |
| `/:tenantId/read-all` | PUT | ✅ Tenant | Hamısını oxundu et |
| `/:id` | DELETE | ✅ Tenant | Bildiriş sil |
| `/usage-warning` | POST | ✅ System | Usage xəbərdarlığı göndər |

**Notification Types:**
- `usage_warning` - Usage limiti xəbərdarlığı
- `payment_failed` - Ödəniş uğursuz
- `subscription_expiring` - Abunəlik bitir
- `new_booking` - Yeni rezervasiya
- `new_order` - Yeni sifariş

---

## 16. FOLLOW-UPS

**Base:** `/api/follow-ups`

### Configuration

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/templates` | GET | ❌ | Default template-lər |
| `/tenants/:tenantId/configure` | POST | ✅ Tenant | Follow-up konfiqurasiyası |
| `/tenants/:tenantId/config` | GET | ✅ Tenant | Konfiqurasiyalar |
| `/tenants/:tenantId/config/:type/toggle` | PATCH | ✅ Tenant | Follow-up aktiv/deaktiv |

### Scheduling

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/tenants/:tenantId/missed-call` | POST | ✅ Tenant | Buraxılmış zəng follow-up |
| `/tenants/:tenantId/orders/:orderId/upsell` | POST | ✅ Tenant | Sifariş upsell |
| `/tenants/:tenantId/bookings/:bookingId/reminder` | POST | ✅ Tenant | Booking xatırladıcısı |
| `/tenants/:tenantId/bookings/:bookingId/aftercare` | POST | ✅ Tenant | Aftercare follow-up |
| `/tenants/:tenantId/loyalty-reward` | POST | ✅ Tenant | Loyalty reward |
| `/tenants/:tenantId/reactivation` | POST | ✅ Tenant | Reactivation kampaniyası |
| `/tenants/:tenantId/review-request` | POST | ✅ Tenant | Review request |

### Management

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/process` | POST | ❌ | Pending follow-up-ları işlə (cron) |
| `/tenants/:tenantId/pending` | GET | ✅ Tenant | Pending follow-up-lar |
| `/jobs/:jobId` | DELETE | ✅ Tenant | Follow-up ləğv et |
| `/tenants/:tenantId/stats` | GET | ✅ Tenant | Follow-up statistikaları |

**Follow-up Types:**
- `missed_call` - Buraxılmış zənglər üçün
- `order_upsell` - Sifariş sonrası cross-sell/upsell
- `booking_reminder` - Booking xatırladıcısı
- `aftercare` - Xidmət sonrası follow-up
- `loyalty_reward` - Loyal müştərilərə reward
- `reactivation` - Passiv müştəriləri aktivləşdirmə
- `review_request` - Review istəmə

**Nümunə - Missed Call Follow-up:**
```bash
POST /api/follow-ups/tenants/tenant_123/missed-call
Authorization: Bearer {tenant_token}
{
  "customerPhone": "+994501234567",
  "customerName": "Əli Məmmədov",
  "callId": "call_abc123",
  "delayMinutes": 15
}

# 15 dəqiqə sonra SMS göndərilir:
# "Salam Əli, zənginizi buraxdıq. Necə kömək edə bilərik? Cavab yazın və ya zəng edin."
```

---

## 17. CHANNELS

**Base:** `/api/channels`

### WhatsApp Integration

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/whatsapp/webhook` | POST | ❌ | Twilio WhatsApp webhook |
| `/whatsapp/send` | POST | ✅ Tenant | WhatsApp mesaj göndər |
| `/whatsapp/order-confirmation` | POST | ✅ Tenant | Sifariş təsdiqi göndər |

### Web Chat Integration

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/webchat/tenants/:tenantId/sessions` | POST | ❌ | Chat sessiyası başlat |
| `/webchat/sessions/:sessionId/messages` | POST | ❌ | Mesaj göndər |
| `/webchat/sessions/:sessionId/history` | GET | ❌ | Chat tarixi |
| `/webchat/sessions/:sessionId/end` | POST | ❌ | Chat sonlandır |
| `/webchat/tenants/:tenantId/sessions/active` | GET | ✅ Tenant | Aktiv sessionlar |
| `/webchat/sessions/:sessionId/transfer` | POST | ✅ Tenant | Agent-ə transfer et |

### QR Code Ordering

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/qr/:qrId/validate` | GET | ❌ | QR kod təsdiq et |
| `/qr/tenants/:tenantId/generate` | POST | ✅ Tenant | QR kod yarat |
| `/qr/tenants/:tenantId/image` | GET | ✅ Tenant | QR kod şəkli (PNG) |
| `/qr/tenants/:tenantId` | GET | ✅ Tenant | Tenant QR kodları |
| `/qr/tenants/:tenantId/bulk` | POST | ✅ Tenant | Toplu QR kod yaratma |
| `/qr/:qrId` | DELETE | ✅ Tenant | QR kodu deaktiv et |

### Statistics

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/stats/tenants/:tenantId` | GET | ✅ Tenant | Channel statistikaları |

**Nümunə - QR Ordering Flow:**
```bash
# 1. QR kod yaratma (Masa 5 üçün)
POST /api/channels/qr/tenants/tenant_123/generate
{
  "location": "Table 5",
  "type": "table_ordering"
}

# 2. Müştəri QR kodu skan edir
GET /api/channels/qr/qr_abc123/validate

# 3. Menyu göstərilir və sifariş verilir
POST /api/orders
{
  "source": "qr_ordering",
  "qrCodeId": "qr_abc123",
  "items": [...]
}
```

---

## 18. POS INTEGRATIONS

**Base:** `/api/pos-integrations`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/providers` | GET | ❌ | Dəstəklənən POS sistemləri |
| `/tenants/:tenantId/configure` | POST | ✅ Tenant | POS konfiqurasiyası |
| `/tenants/:tenantId/config` | GET | ✅ Tenant | POS konfiqurasiya məlumatı |
| `/tenants/:tenantId/test` | POST | ✅ Tenant | POS connection test |
| `/tenants/:tenantId/orders/:orderId/push` | POST | ✅ Tenant | Sifarişi POS-a göndər |
| `/tenants/:tenantId/bookings/:bookingId/push` | POST | ✅ Tenant | Rezervasiyanı POS-a göndər |
| `/tenants/:tenantId/sync-menu` | POST | ✅ Tenant | Menyunu POS-dan sync et |
| `/tenants/:tenantId/availability` | GET | ✅ Tenant | POS-dan mövcudluq al |
| `/tenants/:tenantId/orders/:orderId/cancel` | POST | ✅ Tenant | POS-da sifarişi ləğv et |

**Dəstəklənən POS Sistemləri:**
- Square POS
- Toast POS
- Clover
- Lightspeed
- Custom API

**Nümunə - Square Integration:**
```bash
# 1. Configure
POST /api/pos-integrations/tenants/tenant_123/configure
{
  "provider": "square",
  "credentials": {
    "accessToken": "sq0atp-...",
    "locationId": "loc_123"
  }
}

# 2. Sync Menu
POST /api/pos-integrations/tenants/tenant_123/sync-menu

# 3. Push Order
POST /api/pos-integrations/tenants/tenant_123/orders/order_456/push
```

---

## 19. AI AGENT

**Base:** `/api/ai-agent`

### Twilio Webhooks (Public)

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/incoming` | POST | ❌ | Daxil olan zəng (Twilio webhook) |
| `/process` | POST | ❌ | Speech input emalı |
| `/status` | POST | ❌ | Zəng statusu yeniləmə |
| `/outbound-twiml` | GET | ❌ | Outbound TwiML generasiyası |

### Authenticated Routes

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/outbound` | POST | ✅ Tenant | Outbound zəng başlat |
| `/sms` | POST | ✅ Tenant | SMS göndər |
| `/test` | POST | ✅ Tenant | AI agent test et (dev) |

**Nümunə - Outbound Call:**
```bash
POST /api/ai-agent/outbound
Authorization: Bearer {tenant_token}
{
  "to": "+994501234567",
  "purpose": "booking_reminder",
  "data": {
    "bookingId": "booking_123",
    "customerName": "Əli",
    "dateTime": "2024-02-15 19:00"
  }
}

# AI zəng edib deyir:
# "Salam Əli, bu gün saat 19:00-da rezervasiyanız var. Təsdiq edirsiniz?"
```

---

## 📊 ENDPOINT-LƏR XÜLASƏSI

| Modul | Endpoint Sayı | Public | Protected |
|-------|---------------|--------|-----------|
| **Auth** | 8 | 6 | 2 |
| **Leads** | 6 | 1 | 5 |
| **Retell AI** | 4 | 4 | 0 |
| **Bookings** | 10 | 0 | 10 |
| **Orders** | 6 | 0 | 6 |
| **Services** | 10 | 0 | 10 |
| **FAQs** | 9 | 2 | 7 |
| **Calls** | 4 | 1 | 3 |
| **Tenants** | 11 | 1 | 10 |
| **Business Types** | 11 | 3 | 8 |
| **Integrations** | 13 | 1 | 12 |
| **Subscriptions** | 6 | 1 | 5 |
| **Customer Dashboard** | 8 | 0 | 8 |
| **Admin Dashboard** | 11 | 0 | 11 |
| **Analytics** | 4 | 1 | 3 |
| **Notifications** | 6 | 0 | 6 |
| **Follow-ups** | 16 | 2 | 14 |
| **Channels** | 19 | 8 | 11 |
| **POS Integrations** | 9 | 1 | 8 |
| **AI Agent** | 7 | 4 | 3 |
| **ÜMUMI** | **165+** | **36** | **129** |

---

## 🔑 AUTHENTICATION TIPLƏRI

1. **Public (❌)** - Token lazım deyil
2. **Bearer Token (✅ Tenant)** - Tenant istifadəçi tokeni
3. **Admin Token (✅ Admin)** - Admin tokeni

**Header Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎯 YENİ ƏLAVƏ OLUNAN MODULLAR (v2.0)

### 🆕 Channels Module
- **WhatsApp Business Integration** - Avtomatik mesajlar
- **Web Chat Widget** - Website üçün canlı chat
- **QR Code Ordering** - Masadan QR ilə sifariş

### 🆕 Advanced Follow-ups
- 7 növ avtomatik follow-up
- Template-based mesajlaşma
- Scheduled follow-ups

### 🆕 POS Integration Framework
- Universal POS connector
- Square, Toast, Clover dəstəyi
- Real-time menu sync

### 🆕 Admin User Approval System
- Email verification
- Admin approval workflow
- Approval notifications

### 🆕 Enhanced Analytics
- Real-time event tracking
- Sentiment analysis
- Daily trends

---

## 📚 ƏLAVƏ RESURSLAR

**Swagger Dokumentasiya:**
```
https://your-domain.com/api-docs
```

**Base URL:**
```
https://your-domain.com/api
```

**Postman Collection:** Yükləmək üçün əlaqə

**WebSocket Events:** Real-time notifications üçün Socket.io dəstəyi

---

## 🚀 ÜSTÜNLÜKLƏRİ

- ✅ 165+ RESTful endpoint
- ✅ 20 modul
- ✅ Multi-tenant arxitektura
- ✅ JWT authentication
- ✅ Real-time notifications
- ✅ Swagger/OpenAPI docs
- ✅ WhatsApp & Web Chat
- ✅ QR Code ordering
- ✅ POS integrations
- ✅ Advanced follow-ups
- ✅ Multi-language support

---

**Versiya:** 2.1.0
**Son Yenilənmə:** 2024-12-21
**Müəllif:** First Ring AI Team

---

## 🆕 YENİLİKLƏR (v2.1.0 - 21 Dekabr 2024)

### Tenant Module Təkmilləşdirmələri:

1. **Partial Subscription Update** ✅
   - Artıq subscription update zamanı bütün field-lər lazım deyil
   - Yalnız dəyişdirmək istədiyiniz field-i göndərin
   - `status` və ya `subscriptionStatus` - hər ikisi işləyir

2. **Language Update** ✅
   - Tenant dilini asanlıqla dəyişdirin
   - `settings.defaultLanguage` kimi saxlanılır
   - Response-da full settings object qaytarılır

3. **Email Göndərmə Təkmilləşdirilməsi** ✅
   - Artıq hər tenant yaradılanda email göndərilir
   - Password varsa → Welcome email
   - Password yoxsa → Verification email

4. **Status Validation** ✅
   - Subscription status və plan üçün built-in validation
   - Aydın error mesajları
   - Frontend üçün rahat
