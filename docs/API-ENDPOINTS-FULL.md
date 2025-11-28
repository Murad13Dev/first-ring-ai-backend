# 🚀 FIRST RING AI - BÜTÜN API ENDPOINT-LƏR

**Ümumi Backend URL:** `https://your-domain.com/api`

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
| `/` | GET | ✅ Admin | Bütün tenantlar |
| `/:id` | GET | ✅ Tenant | Tenant detalları |
| `/:id` | PUT | ✅ Tenant | Tenant yeniləmə |
| `/:id` | DELETE | ✅ Admin | Tenant deaktiv etmə |
| `/:id/stats` | GET | ✅ Tenant | Tenant statistikaları |
| `/:id/subscription` | PUT | ✅ Admin | Abunə yeniləmə |
| `/languages` | GET | ❌ | Dəstəklənən dillər |

**Nümunə - Tenant Info:**
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
  "status": "active",
  "plan": "professional"
}
```

---

## 10. BUSINESS TYPES

**Base:** `/api/business-types`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | GET | ❌ | Biznes tipləri siyahısı |
| `/:slug` | GET | ❌ | Biznes tipi detalları |
| `/` | POST | ✅ Admin | Yeni biznes tipi əlavə |
| `/:id` | PUT | ✅ Admin | Biznes tipi yeniləmə |
| `/:id` | DELETE | ✅ Admin | Biznes tipi silinməsi |
| `/:slug/functions` | GET | ❌ | Biznes tipi funksiyaları |
| `/:id/functions` | POST | ✅ Admin | Funksiya əlavə etmə |
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
| `/subscribe` | POST | ✅ Tenant | Yeni subscription yaratma |
| `/:id` | GET | ✅ Tenant | Subscription detalları |
| `/:id` | PUT | ✅ Admin | Subscription yeniləmə |
| `/:id/cancel` | POST | ✅ Tenant | Subscription ləğvi |

**Plans:**
- Starter: $99/month - 500 dəq
- Professional: $299/month - 2000 dəq
- Enterprise: Custom - Unlimited

---

## 13. DASHBOARDS

### Customer Dashboard

**Base:** `/api/dashboard`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/overview` | GET | ✅ Tenant | Tenant overview (stats) |
| `/calls` | GET | ✅ Tenant | Son zənglər |
| `/bookings` | GET | ✅ Tenant | Son bookinglar |
| `/orders` | GET | ✅ Tenant | Son sifarişlər |
| `/analytics` | GET | ✅ Tenant | Analytics məlumatı |
| `/usage` | GET | ✅ Tenant | Usage metrics (call minutes) |

### Admin Dashboard

**Base:** `/api/admin`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/overview` | GET | ✅ Admin | Platform stats |
| `/tenants` | GET | ✅ Admin | Bütün tenantlar |
| `/users` | GET | ✅ Admin | Bütün istifadəçilər |
| `/calls/stats` | GET | ✅ Admin | Call analytics |
| `/revenue` | GET | ✅ Admin | Revenue metrics |
| `/churn` | GET | ✅ Admin | Churn analysis |

**Nümunə - Tenant Overview:**
```bash
GET /api/dashboard/overview
Authorization: Bearer {tenant_token}

# Cavab:
{
  "totalCalls": 450,
  "totalBookings": 120,
  "totalOrders": 85,
  "revenue": 12500,
  "callMinutesUsed": 1850,
  "callMinutesLimit": 2000
}
```

---

## 14. ANALYTICS

**Base:** `/api/analytics`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/track` | POST | ❌ | Event tracking |
| `/platform` | GET | ✅ Admin | Platform analytics |
| `/:tenantId` | GET | ✅ Tenant | Tenant analytics |
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
| `/` | GET | ✅ Tenant | Bildirişlər siyahısı |
| `/:id/read` | PUT | ✅ Tenant | Oxundu qeyd et |
| `/read-all` | PUT | ✅ Tenant | Hamısını oxundu et |

---

## 16. FOLLOW-UPS

**Base:** `/api/follow-ups`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/configs` | GET | ✅ Tenant | Follow-up konfiqurasiyaları |
| `/configs` | POST | ✅ Tenant | Yeni konfiq yaratma |
| `/configs/:id` | PUT | ✅ Tenant | Konfiq yeniləmə |
| `/jobs` | GET | ✅ Tenant | Follow-up joblar |
| `/jobs/:id/execute` | POST | ✅ Tenant | Job icra etmə |

**Follow-up Types:**
- `missed_call` - Buraxılmış zənglər üçün
- `order_upsell` - Sifariş sonrası
- `booking_reminder` - Booking xatırladıcısı

---

## 17. CHANNELS

**Base:** `/api/channels`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/` | GET | ✅ Tenant | Kanallar siyahısı |
| `/:id` | PUT | ✅ Tenant | Kanal yeniləmə |

**Channels:**
- Phone (Twilio)
- SMS
- Email
- WhatsApp (coming soon)

---

## 18. POS INTEGRATIONS

**Base:** `/api/pos-integrations`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/square/connect` | POST | ✅ Tenant | Square bağlantısı |
| `/square/locations` | GET | ✅ Tenant | Square locations |
| `/square/sync` | POST | ✅ Tenant | Square sync |

---

## 19. AI AGENT

**Base:** `/api/ai-agent`

| Endpoint | Method | Auth | İstifadə |
|----------|--------|------|----------|
| `/incoming` | POST | ❌ | Twilio incoming call webhook |
| `/process` | POST | ❌ | Speech processing |
| `/status` | POST | ❌ | Call status update |
| `/outbound` | POST | ✅ Tenant | Outbound zəng başlatma |
| `/sms` | POST | ✅ Tenant | SMS göndərmə |
| `/test` | POST | ✅ Dev | AI test etmə |
| `/outbound-twiml` | GET | ❌ | TwiML generation |

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
| **FAQs** | 8 | 2 | 6 |
| **Calls** | 4 | 1 | 3 |
| **Tenants** | 8 | 1 | 7 |
| **Business Types** | 8 | 3 | 5 |
| **Integrations** | 13 | 1 | 12 |
| **Subscriptions** | 5 | 1 | 4 |
| **Dashboards** | 12 | 0 | 12 |
| **Analytics** | 4 | 1 | 3 |
| **Notifications** | 3 | 0 | 3 |
| **Follow-ups** | 5 | 0 | 5 |
| **Channels** | 2 | 0 | 2 |
| **POS** | 3 | 0 | 3 |
| **AI Agent** | 7 | 5 | 2 |
| **ÜMUMI** | **126+** | **26** | **100** |

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

## 📚 POSTMAN COLLECTION

Bütün endpoint-ləri test etmək üçün Swagger UI:
```
https://your-domain.com/api-docs
```

---

**Son Yenilənmə:** 2024-01-27
**Versiya:** 1.0.0
**Ümumi Endpoint Sayı:** 126+
