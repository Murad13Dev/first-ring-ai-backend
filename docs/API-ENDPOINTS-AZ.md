# 🇦🇿 FIRST RING AI - API ENDPOINT-LƏR (AZ)

**Qısa və Sadə Bələdçi**

---

## 🎯 ƏSAS MODULLAR

### 1. 🔐 AUTH (Giriş/Çıxış)
```
POST   /api/auth/register         - Qeydiyyat
POST   /api/auth/login            - Giriş
POST   /api/auth/logout           - Çıxış
GET    /api/auth/me               - Profil məlumatı
POST   /api/auth/admin/login      - Admin girişi
```

**Nümunə:**
```bash
POST /api/auth/login
{
  "email": "ali@restaurant.az",
  "password": "parol123"
}
```

---

### 2. 📝 LEADS (Potensial Müştərilər)
```
POST   /api/leads                 - Lead yarat (web form, AI zəng)
GET    /api/leads                 - Bütün leadlər (admin)
GET    /api/leads/:id             - Lead detalları
PUT    /api/leads/:id             - Lead yenilə
POST   /api/leads/:id/convert     - Tenant-a çevir (admin)
```

**İstifadə:** Web formdan və ya AI zəngindən gələn müştəri məlumatları

---

### 3. 🤖 RETELL AI (AI Agent)
```
POST   /api/retell/webhook                    - Retell webhook
POST   /api/retell/functions/general          - Sales agent funksiyaları
POST   /api/retell/functions/:tenantId        - Biznes funksiyaları
GET    /api/retell/functions/:tenantId/available - Funksiya siyahısı
```

**Funksiyalar:**
- **Sales Agent:** create_sales_lead, send_pricing_packages, schedule_demo
- **Restaurant:** check_availability, create_reservation, get_menu, create_order
- **Retail:** check_inventory, get_product_info, create_order
- **Medical:** check_availability, book_appointment, get_doctors

---

### 4. 📅 BOOKİNGS (Rezervasiyalar)
```
POST   /api/bookings              - Rezervasiya yarat
GET    /api/bookings              - Rezervasiyalar siyahısı
GET    /api/bookings/availability - Mövcudluq yoxla
GET    /api/bookings/:id          - Rezervasiya detalları
POST   /api/bookings/:id/confirm  - Təsdiq et
POST   /api/bookings/:id/cancel   - Ləğv et
```

**İstifadə:** Restoran, salon, hotel rezervasiyaları

---

### 5. 🛒 ORDERS (Sifarişlər)
```
POST   /api/orders                - Sifariş yarat
GET    /api/orders                - Sifarişlər siyahısı
GET    /api/orders/:id            - Sifariş detalları
PUT    /api/orders/:id            - Sifariş yenilə
POST   /api/orders/:id/checkout   - Ödəniş linki yarat
```

**İstifadə:** Restoran sifarişləri, retail məhsul sifarişləri

---

### 6. 🍕 SERVİCES (Menyu/Xidmətlər)
```
POST   /api/services              - Xidmət əlavə et
GET    /api/services              - Xidmətlər siyahısı
PUT    /api/services/:id          - Xidmət yenilə
DELETE /api/services/:id          - Xidmət sil
GET    /api/services/stock/low    - Az stoklu məhsullar
```

**İstifadə:** Restoran menyusu, salon xidmətləri, retail məhsullar

---

### 7. ❓ FAQS (Sual-Cavab)
```
POST   /api/faqs                  - FAQ əlavə et
GET    /api/faqs                  - FAQ siyahısı
POST   /api/faqs/search           - FAQ axtar (AI üçün)
PUT    /api/faqs/:id              - FAQ yenilə
```

**İstifadə:** AI agent tez-tez verilən suallara cavab verir

---

### 8. 📞 CALLS (Zəng Logları)
```
POST   /api/calls                 - Zəng loqu yarat
GET    /api/calls                 - Zənglər siyahısı
GET    /api/calls/stats           - Zəng statistikaları
GET    /api/calls/:id             - Zəng detalları (transkript)
```

**İstifadə:** Bütün zənglər qeydə alınır, analiz edilir

---

### 9. 🏢 TENANTS (Biznes Müştəriləri)
```
POST   /api/tenants               - Tenant yarat (admin)
GET    /api/tenants               - Bütün tenantlar (admin)
GET    /api/tenants/:id           - Tenant məlumatı
PUT    /api/tenants/:id           - Tenant yenilə
GET    /api/tenants/:id/stats     - Tenant statistikaları
```

**İstifadə:** Hər bir biznes müştərisi (restoran, klinika, və s.)

---

### 10. 🔗 INTEGRATİONS (İnteqrasiyalar)

**Google Sheets:**
```
GET    /api/integrations/sheets/auth        - Google bağlan
POST   /api/integrations/sheets/export/calls - Zəngləri export et
```

**Google Calendar:**
```
GET    /api/integrations/calendar/auth      - Calendar bağlan
POST   /api/integrations/calendar/sync      - Booking sync et
```

**İstifadə:** Google Calendar-a rezervasiyalar avtomatik yazılır

---

### 11. 📊 DASHBOARDS (İdarə Paneli)

**Tenant Dashboard:**
```
GET    /api/dashboard/overview    - Ümumi statistika
GET    /api/dashboard/calls       - Son zənglər
GET    /api/dashboard/bookings    - Son rezervasiyalar
GET    /api/dashboard/usage       - İstifadə məlumatı
```

**Admin Dashboard:**
```
GET    /api/admin/overview        - Platform statistikası
GET    /api/admin/tenants         - Bütün müştərilər
GET    /api/admin/revenue         - Gəlir məlumatı
```

---

## 🔑 AUTHENTİCATİON

### Bearer Token İstifadəsi:

```bash
# 1. Login ol
POST /api/auth/login
{
  "email": "owner@restaurant.az",
  "password": "parol123"
}

# Cavab:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}

# 2. Token ilə API çağır
GET /api/bookings
Authorization: Bearer eyJhbGc...
```

---

## 📋 İSTİFADƏ SENARİLƏRİ

### Senariya 1: Web Formdan Lead
```
1. Müştəri web formunu doldurur
   ↓
2. POST /api/leads
   {
     "source": "landing_page_form",
     "contactName": "Əli Məmmədov",
     "email": "ali@example.com",
     "businessName": "Cafe AZ"
   }
   ↓
3. Lead bazaya yazılır
   ↓
4. Admin panel-də görünür
```

---

### Senariya 2: AI Zəngi ilə Rezervasiya
```
1. Müştəri restoran nömrəsinə zəng edir
   ↓
2. Retell AI cavab verir
   ↓
3. AI: "Neçə nəfərəsiniz?"
   Müştəri: "4 nəfər"
   ↓
4. POST /api/retell/functions/tenant_123
   {
     "function_name": "create_reservation",
     "args": {
       "name": "Vüqar",
       "phone": "+994501234567",
       "partySize": 4,
       "date": "2024-02-15",
       "time": "19:00"
     }
   }
   ↓
5. Rezervasiya bazaya yazılır
   ↓
6. Google Calendar-a sync olur
   ↓
7. SMS təsdiqi göndərilir
```

---

### Senariya 3: Sales Agent Lead Capture
```
1. Müştəri First Ring AI nömrəsinə zəng edir
   ↓
2. Sales AI suallar verir
   ↓
3. POST /api/retell/functions/general
   {
     "function_name": "create_sales_lead",
     "args": {
       "name": "Dr. Sarah",
       "email": "sarah@dental.com",
       "businessName": "Smile Dental",
       "businessType": "dental"
     }
   }
   ↓
4. Lead yaradılır
   ↓
5. POST /api/retell/functions/general
   {
     "function_name": "send_pricing_packages"
   }
   ↓
6. Pricing email göndərilir
```

---

## 🚀 TƏLƏBLƏR

### Public Endpoint-lər (Token lazım deyil):
- `/api/auth/register`
- `/api/auth/login`
- `/api/leads` POST
- `/api/retell/*` (webhook-lər)
- `/api/faqs/search`

### Protected Endpoint-lər (Token lazımdır):
- `/api/bookings/*`
- `/api/orders/*`
- `/api/services/*`
- `/api/dashboard/*`
- `/api/tenants/*`

---

## 📞 DƏSTƏK

**Swagger Dokumentasiya:**
```
https://your-domain.com/api-docs
```

**Base URL:**
```
https://your-domain.com/api
```

**Postman Collection:** API-ENDPOINTS-FULL.md faylında

---

**Xülasə:**
- ✅ 126+ endpoint
- ✅ 19 modul
- ✅ RESTful dizayn
- ✅ JWT authentication
- ✅ Swagger dokumentasiya
- ✅ Multi-tenant arxitektura
