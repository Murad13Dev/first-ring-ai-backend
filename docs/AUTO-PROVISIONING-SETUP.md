# 🤖 Avtomatik Provisioning Sistemi

## 📋 Ümumi Baxış

Bu sistem müştəri qeydiyyatdan keçəndə avtomatik olaraq:
1. ✅ Twilio telefon nömrəsi alır
2. ✅ Retell AI agent yaradır
3. ✅ Webhook URL-lərini konfiqurasiya edir
4. ✅ Database-də məlumatları saxlayır

**Artıq əl ilə Twilio Dashboard və ya Retell Dashboard-da işləməyə ehtiyac yoxdur!**

---

## 🔧 Konfiqurasiya

### .env Faylına Əlavə Edin

```bash
# Twilio Credentials (Master Account)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Retell AI Credentials
RETELL_API_KEY=your_retell_api_key_here

# API URL (Production və ya Development)
API_URL=https://api.firstringai.com
# Development üçün: API_URL=https://xxxx-xx-xxx-xxx-xx.ngrok-free.app
```

**Qeyd:**
- `TWILIO_ACCOUNT_SID` və `TWILIO_AUTH_TOKEN` - Sizin master Twilio hesabınızdır
- Bu credentials ilə sistem avtomatik nömrələr alır və idarə edir
- `RETELL_API_KEY` - Retell AI dashboard-dan alınır (Settings → API Keys)

---

## 🚀 Necə İşləyir?

### 1️⃣ **Lead Conversion (Avtomatik)**

Admin lead-i tenant-ə çevirdikdə:

```bash
POST /api/leads/{leadId}/convert
Authorization: Bearer {admin_token}
```

**Sistem avtomatik olaraq:**
1. ✅ Tenant və User yaradır
2. ✅ Twilio nömrəsi axtarır və alır (US nömrələri)
3. ✅ Webhook URL-lərini təyin edir:
   - Voice: `/api/ai-agent/incoming`
   - Status: `/api/ai-agent/status`
   - SMS: `/api/ai-agent/sms-incoming`
4. ✅ Retell AI agent yaradır (business type əsasında prompt ilə)
5. ✅ Database-də `twilioNumber` və `retellAgentId` saxlayır
6. ✅ Müştəriyə welcome email göndərir

**Nəticə:**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "Pizza House",
      "businessType": "restaurant",
      "twilioNumber": "+19291234567",
      "retellAgentId": "agent_xxxxxxxxxxxxx"
    },
    "user": {
      "email": "owner@pizzahouse.com",
      "role": "owner"
    },
    "tempPassword": "TempPass123!"
  }
}
```

---

### 2️⃣ **Manual Tenant Creation (Seçimli Avtomatik)**

Admin əl ilə tenant yaradanda:

```bash
POST /api/tenants
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Dental Clinic",
  "businessType": "dental",
  "email": "clinic@example.com",
  "ownerName": "Dr. Smith",
  "ownerEmail": "dr.smith@example.com",
  "ownerPassword": "SecurePass123!",

  // ⬇️ Avtomatik provisioning aktivləşdirin:
  "autoProvisionPhone": true,
  "autoProvisionAgent": true,
  "phoneAreaCode": "929",
  "language": "en-US"
}
```

**Parametrlər:**
- `autoProvisionPhone: true` - Avtomatik telefon nömrəsi al
- `autoProvisionAgent: true` - Avtomatik Retell agent yarat
- `phoneAreaCode: "929"` - Area code seçimi (optional)
- `language: "en-US"` - Agent dili (default: en-US)

---

## 📊 Database Strukturu

### Tenant Model (Yenilənmiş)

```prisma
model Tenant {
  id              String   @id @default(uuid())
  name            String
  businessType    String
  email           String   @unique

  twilioNumber    String?  @unique  // ✅ Avtomatik əlavə olunur
  retellAgentId   String?  @unique  // ✅ Avtomatik əlavə olunur

  // ... digər fieldlər
}
```

---

## 🔄 Tam İş Axını (Yenilənmiş)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Lead yaranır (Web Form və ya AI Sales Call)            │
│     POST /api/leads                                         │
│     { source: "landing_page_form" | "ai_call" }             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Admin lead-i yoxlayır və təsdiq edir                   │
│     GET /api/leads?status=new                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Admin "Convert to Tenant" edir                         │
│     POST /api/leads/{id}/convert                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │  🤖 AVTOMATIK PROSESS BAŞLAYIR        │
        └───────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4a. Tenant və Owner User yaradılır                        │
│      ✅ Database-də record yaranır                          │
│      ✅ Password hash olunur                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4b. Twilio Nömrəsi Avtomatik Alınır                       │
│      🔍 Available numbers search edilir (US)                │
│      💰 İlk tapılan nömrə purchase edilir                   │
│      🔗 Webhook URLs konfiqurasiya olunur                   │
│      💾 twilioNumber database-də saxlanılır                 │
│                                                             │
│      Nəticə: +19291234567                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4c. Retell AI Agent Avtomatik Yaradılır                   │
│      🤖 Business type-a uyğun system prompt generate olur   │
│      🎙️ Voice model seçilir (language əsasında)            │
│      🔧 Custom functions konfiqurasiya olunur               │
│      💾 retellAgentId database-də saxlanılır                │
│                                                             │
│      Nəticə: agent_abc123xyz789                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4d. Lead Status Update                                     │
│      ✅ status: "converted"                                 │
│      ✅ convertedToTenantId: tenant.id                      │
│      ✅ convertedAt: now()                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Welcome Email Göndərilir                                │
│     📧 To: owner@example.com                                │
│     📝 Subject: "Welcome to First Ring AI"                  │
│     🔑 Temporary password daxildir                          │
│     📞 Assigned phone number: +19291234567                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  6. ✅ SİSTEM HAZIRDIR!                                     │
│                                                             │
│     ✓ Müştəri admin panel-ə daxil ola bilər                │
│     ✓ Telefon nömrəsi zəngləri qəbul edir                  │
│     ✓ AI agent aktivdir və danışa bilir                    │
│     ✓ Heç bir əl ilə konfiqurasiya tələb olunmur          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📞 Zəng Routing (Call Routing)

### Incoming Call Flow

```
1. Müştəri zəng edir: +19291234567
                ↓
2. Twilio webhook göndərir:
   POST https://api.firstringai.com/api/ai-agent/incoming
   {
     "CallSid": "CAxxxx",
     "From": "+14155551234",
     "To": "+19291234567"  ← Bu nömrə əsasında tenant tapılır
   }
                ↓
3. Backend-də tenant axtarışı:
   SELECT * FROM tenants
   WHERE twilioNumber = '+19291234567'
                ↓
4. Tenant tapıldı:
   {
     "id": "uuid-123",
     "name": "Pizza House",
     "businessType": "restaurant",
     "retellAgentId": "agent_xxx"
   }
                ↓
5. Tenant-in məlumatları yüklənir:
   - FAQs
   - Services
   - Business Hours
   - Settings
                ↓
6. AI agent cavab verir (tenant context ilə)
   TwiML response generate olunur
                ↓
7. Conversation başlayır
```

---

## 🛠️ Xidmət Funksiyaları (Service Functions)

### Twilio Provisioning Service

**Location:** `src/services/twilio-provisioning.service.ts`

**Funksiyalar:**

1. **searchAvailableNumbers(options)**
   - Mövcud nömrələri axtarır
   - Area code və country filter

2. **purchasePhoneNumber(phoneNumber, tenantId)**
   - Nömrəni alır
   - Webhook URL-ləri təyin edir

3. **autoProvisionForTenant(tenantId, options)**
   - Tam avtomatik: axtarış + alış
   - Ən sürətli variant

4. **releasePhoneNumber(phoneNumber)**
   - Tenant silinəndə nömrəni azad edir

5. **updateWebhookUrls(phoneNumber, tenantId)**
   - Webhook URL-lərini yeniləyir

**Istifadə nümunəsi:**

```typescript
import twilioProvisioningService from './services/twilio-provisioning.service';

// Avtomatik provisioning
const phoneNumber = await twilioProvisioningService.autoProvisionForTenant(
  'tenant-uuid',
  {
    areaCode: '929',
    countryCode: 'US'
  }
);

console.log(`Phone provisioned: ${phoneNumber}`);
// Output: Phone provisioned: +19291234567
```

---

### Retell AI Provisioning Service

**Location:** `src/services/retell-provisioning.service.ts`

**Funksiyalar:**

1. **createAgentForTenant(options)**
   - Yeni agent yaradır
   - Business type əsasında prompt generate edir
   - Custom functions konfiqurasiya edir

2. **updateAgent(agentId, updates)**
   - Agent settings-i yeniləyir

3. **deleteAgent(agentId)**
   - Agent-i silir

4. **getAgentDetails(agentId)**
   - Agent məlumatlarını gətirir

**Istifadə nümunəsi:**

```typescript
import retellProvisioningService from './services/retell-provisioning.service';

// Agent yaratmaq
const agentId = await retellProvisioningService.createAgentForTenant({
  tenantId: 'tenant-uuid',
  tenantName: 'Pizza House',
  businessType: 'restaurant',
  language: 'en-US'
});

console.log(`Agent created: ${agentId}`);
// Output: Agent created: agent_abc123xyz789
```

---

## 🔐 Environment Variables (Tam Siyahı)

```bash
# ==========================================
# DATABASE
# ==========================================
DATABASE_URL=postgresql://user:password@localhost:5432/firstringai

# ==========================================
# JWT
# ==========================================
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# ==========================================
# TWILIO (Master Account)
# ==========================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567  # Platform-un öz sales nömrəsi

# ==========================================
# RETELL AI
# ==========================================
RETELL_API_KEY=your_retell_api_key_here

# ==========================================
# OPENAI
# ==========================================
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# ==========================================
# API URL
# ==========================================
API_URL=https://api.firstringai.com
# Development: API_URL=https://xxxx.ngrok-free.app

# ==========================================
# EMAIL (NodeMailer)
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@firstringai.com
SMTP_PASSWORD=your_email_password
SALES_EMAIL=sales@firstringai.com

# ==========================================
# SQUARE (Payment Processing)
# ==========================================
SQUARE_ACCESS_TOKEN=your_square_token
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=your_location_id
```

---

## 📈 Monitoring və Logging

Bütün avtomatik proseslər log edilir:

```typescript
// Twilio provisioning logs
logger.info('Auto-provisioning Twilio phone number', { tenantId });
logger.info('Twilio phone number provisioned', { tenantId, twilioNumber });
logger.error('Failed to auto-provision phone number', { error, tenantId });

// Retell agent creation logs
logger.info('Auto-provisioning Retell AI agent', { tenantId });
logger.info('Retell AI agent provisioned', { tenantId, retellAgentId });
logger.error('Failed to auto-provision Retell agent', { error, tenantId });

// Lead conversion logs
logger.info('Lead converted to tenant successfully', { leadId, tenantId });
```

---

## ❌ Error Handling

**Əgər avtomatik provisioning uğursuz olarsa:**
- ✅ Tenant yenə də yaradılır (conversion fail olmur)
- ⚠️ Error log edilir
- 📧 Admin notification göndərilə bilər (TODO)
- 🔄 Sonradan manual olaraq retry edilə bilər

**Retry üçün:**
```bash
# Manual provision request (TODO - endpoint)
POST /api/admin/tenants/{id}/provision-phone
POST /api/admin/tenants/{id}/provision-agent
```

---

## 🧪 Testing

### 1. Test Twilio Provisioning

```bash
# Service-i test edin
npm test -- twilio-provisioning.service.test.ts
```

### 2. Test Lead Conversion

```bash
# Lead yarat
POST /api/leads
{
  "source": "landing_page_form",
  "contactName": "Test User",
  "email": "test@example.com",
  "phone": "+14155551234",
  "businessName": "Test Business",
  "businessType": "restaurant"
}

# Convert et
POST /api/leads/{leadId}/convert
Authorization: Bearer {admin_token}

# Yoxla
GET /api/tenants/{tenantId}
# twilioNumber və retellAgentId dolmalıdır
```

---

## 💡 Tips və Best Practices

### 1. Area Code Seçimi
```typescript
// Tenant-in location-una uyğun area code istifadə edin
const areaCodes = {
  'New York': '929',
  'Los Angeles': '213',
  'Chicago': '312',
  'Houston': '713',
  // ...
};
```

### 2. Language Detection
```typescript
// Lead-dən dil təyin edin
const language = lead.preferredLanguage || 'en-US';
```

### 3. Cost Management
- Hər Twilio nömrəsi: ~$1/ay
- Hər Retell agent: API usage-ə görə
- Test environment üçün provisioning-i disable edin:
  ```typescript
  const enableAutoProvision = process.env.NODE_ENV === 'production';
  ```

---

## 🚨 Production Checklist

- [ ] `.env` faylında bütün credentials dəqiq
- [ ] `API_URL` production URL-ə set olunub
- [ ] Twilio account-da kifayət qədər balance
- [ ] Retell API key valid və active
- [ ] Database migration run edilib (`retellAgentId` field əlavə edilib)
- [ ] Email service konfiqurasiya olunub
- [ ] Logging və monitoring aktiv
- [ ] Error notifications konfiqurasiya olunub

---

## 📚 Əlaqəli Sənədlər

- [API Endpoints Documentation](./API-ENDPOINTS-FULL.md)
- [Retell Sales Agent Setup](./RETELL-SALES-AGENT-SETUP.md)
- [Multi-tenant Architecture](./ARCHITECTURE.md)

---

## 🎉 Xülasə

**Əvvəl (Manual):**
1. Admin Twilio Dashboard-da nömrə alırdı
2. Webhook URL-lərini əl ilə təyin edirdi
3. Retell Dashboard-da agent yaradırdı
4. Database-də əl ilə update edirdi
⏱️ **Vaxt: ~15-20 dəqiqə**

**İndi (Avtomatik):**
1. Admin sadəcə "Convert" button-u basır
2. Sistem hər şeyi öz-özünə edir
⏱️ **Vaxt: ~30 saniyə**

**96% daha sürətli! 🚀**
