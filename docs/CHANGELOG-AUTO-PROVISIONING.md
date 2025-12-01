# 🚀 Auto-Provisioning System - Dəyişikliklər

## 📅 Tarix: 2025-12-01

## 🎯 Məqsəd
Müştəri qeydiyyatdan keçəndə avtomatik olaraq Twilio telefon nömrəsi və Retell AI agent-in yaradılması və konfiqurasiyası.

---

## ✅ Edilən Dəyişikliklər

### 1️⃣ **Database Schema** (Prisma)

**Fayl:** `prisma/schema.prisma`

**Dəyişiklik:**
```prisma
model Tenant {
  // ... mövcud fieldlər

  twilioNumber    String?  @unique  // Artıq mövcud idi
  retellAgentId   String?  @unique  // ✅ YENİ ƏLAVƏ EDİLDİ

  // ...

  @@index([retellAgentId])  // ✅ YENİ INDEX
}
```

**Migration Faylı:** `prisma/migrations/20251201083800_add_retell_agent_id/migration.sql`

**Migration SQL:**
```sql
ALTER TABLE "tenants" ADD COLUMN "retellAgentId" TEXT;
CREATE UNIQUE INDEX "tenants_retellAgentId_key" ON "tenants"("retellAgentId");
CREATE INDEX "tenants_retellAgentId_idx" ON "tenants"("retellAgentId");
```

---

### 2️⃣ **Yeni Service: Twilio Provisioning**

**Fayl:** `src/services/twilio-provisioning.service.ts` ✅ YENİ

**Funksiyalar:**
- `searchAvailableNumbers(options)` - Mövcud nömrələri axtarır
- `purchasePhoneNumber(phoneNumber, tenantId)` - Nömrə alır və webhook-ları konfiqurasiya edir
- `autoProvisionForTenant(tenantId, options)` - Tam avtomatik provisioning
- `releasePhoneNumber(phoneNumber)` - Nömrəni azad edir
- `updateWebhookUrls(phoneNumber, tenantId)` - Webhook URL-lərini yeniləyir
- `getPhoneNumberDetails(phoneNumber)` - Nömrə məlumatlarını gətirir

**Xüsusiyyətlər:**
- Avtomatik Twilio API ilə inteqrasiya
- Area code seçimi
- Webhook URL-lərinin avtomatik konfiqurasiyası
- Error handling və logging

---

### 3️⃣ **Yeni Service: Retell AI Provisioning**

**Fayl:** `src/services/retell-provisioning.service.ts` ✅ YENİ

**Funksiyalar:**
- `createAgentForTenant(options)` - Yeni agent yaradır
- `updateAgent(agentId, updates)` - Agent-i yeniləyir
- `deleteAgent(agentId)` - Agent-i silir
- `getAgentDetails(agentId)` - Agent məlumatlarını gətirir

**Xüsusiyyətlər:**
- Business type əsasında avtomatik system prompt generation
- 8 müxtəlif business type üçün custom prompt-lar:
  - Restaurant
  - Hotel
  - Clinic
  - Dental
  - Retail Store
  - Salon
  - Fitness
  - Other
- Language-based voice selection
- Custom functions konfiqurasiyası
- Boosted keywords (daha yaxşı speech recognition üçün)

---

### 4️⃣ **Tenant Service Yeniləmələri**

**Fayl:** `src/modules/tenants/tenants.service.ts` ✅ DEYİŞDİRİLDİ

**Yeni Import-lar:**
```typescript
import twilioProvisioningService from '../../services/twilio-provisioning.service';
import retellProvisioningService from '../../services/retell-provisioning.service';
```

**Yeni Interface Fieldləri:**
```typescript
interface CreateTenantData {
  // ... mövcud fieldlər

  // ✅ YENİ ƏLAVƏ EDİLDİ:
  autoProvisionPhone?: boolean;  // Avtomatik telefon nömrəsi al
  autoProvisionAgent?: boolean;  // Avtomatik Retell agent yarat
  phoneAreaCode?: string;        // Area code seçimi
  language?: string;             // Agent dili
}
```

**Yenilənmiş `createTenant()` metodu:**
- Tenant yaradıldıqdan sonra avtomatik provisioning
- `autoProvisionPhone: true` olarsa → Twilio nömrə alır
- `autoProvisionAgent: true` olarsa → Retell agent yaradır
- Error-lar tenant creation-u block etmir (fail-safe)
- Hər provisioning addımı log edilir

---

### 5️⃣ **Lead Conversion Yeniləmələri**

**Fayl:** `src/modules/leads/leads.service.ts` ✅ DEYİŞDİRİLDİ

**Yeni Import-lar:**
```typescript
import twilioProvisioningService from '../../services/twilio-provisioning.service';
import retellProvisioningService from '../../services/retell-provisioning.service';
```

**Yenilənmiş `convertLeadToTenant()` metodu:**

Lead tenant-ə convert edildikdə avtomatik olaraq:
1. ✅ Tenant və User yaradılır
2. ✅ **Twilio nömrəsi avtomatik alınır** (yeni)
3. ✅ **Retell agent avtomatik yaradılır** (yeni)
4. ✅ Lead status update edilir
5. ✅ Welcome email göndərilir

**Provisioning Logic:**
```typescript
// Twilio nömrə provisioning
const twilioNumber = await twilioProvisioningService.autoProvisionForTenant(
  tenant.id,
  { countryCode: 'US' }
);

// Retell agent provisioning
const retellAgentId = await retellProvisioningService.createAgentForTenant({
  tenantId: tenant.id,
  tenantName: tenant.name,
  businessType: tenant.businessType,
  language: 'en-US'
});
```

---

### 6️⃣ **Yeni Sənədlər**

#### ✅ `docs/AUTO-PROVISIONING-SETUP.md` (YENİ)
Tam avtomatik provisioning sisteminin izahı:
- Konfiqurasiya təlimatları
- İş axını diaqramları
- API usage nümunələri
- Error handling
- Production checklist

#### ✅ `docs/CHANGELOG-AUTO-PROVISIONING.md` (YENİ - Bu fayl)
Bütün edilən dəyişikliklərin siyahısı

---

## 📋 Tətbiq Etmək Üçün Addımlar

### 1. Database Migration

```bash
# Prisma migration run et
npx prisma migrate deploy

# Və ya manual SQL:
psql -d first_ring_ai -c "
  ALTER TABLE tenants ADD COLUMN retellAgentId TEXT;
  CREATE UNIQUE INDEX tenants_retellAgentId_key ON tenants(retellAgentId);
  CREATE INDEX tenants_retellAgentId_idx ON tenants(retellAgentId);
"
```

### 2. Environment Variables Yoxla

`.env` faylında bu dəyərlərin olduğunu təsdiq et:

```bash
# Twilio (Master Account)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token

# Retell AI
RETELL_API_KEY=your_retell_api_key  # ✅ ÇOX ÖNƏMLİ!

# API URL (production və ya ngrok)
API_URL=https://api.firstringai.com
```

### 3. Dependencies Install

```bash
npm install
```

### 4. Prisma Client Regenerate

```bash
npx prisma generate
```

### 5. Server Restart

```bash
npm run dev
# və ya
pm2 restart first-ring-ai-backend
```

---

## 🧪 Test Etmək

### Test 1: Lead Conversion

```bash
# 1. Lead yarat
POST /api/leads
{
  "source": "landing_page_form",
  "contactName": "Test User",
  "email": "test@example.com",
  "phone": "+14155551234",
  "businessName": "Test Restaurant",
  "businessType": "restaurant"
}

# 2. Lead-i convert et (admin token lazımdır)
POST /api/leads/{leadId}/convert
Authorization: Bearer {admin_token}

# 3. Yoxla
GET /api/tenants/{tenantId}

# Gözlənilən nəticə:
{
  "id": "uuid",
  "name": "Test Restaurant",
  "twilioNumber": "+19291234567",  # ✅ Avtomatik əlavə olunmuşdur
  "retellAgentId": "agent_xxxxx",   # ✅ Avtomatik əlavə olunmuşdur
  ...
}
```

### Test 2: Manual Tenant Creation

```bash
POST /api/tenants
Authorization: Bearer {admin_token}
{
  "name": "Test Clinic",
  "businessType": "clinic",
  "email": "clinic@test.com",
  "ownerName": "Dr. Test",
  "ownerEmail": "dr.test@test.com",
  "ownerPassword": "SecurePass123!",
  "autoProvisionPhone": true,  # ✅ Aktivləşdir
  "autoProvisionAgent": true,  # ✅ Aktivləşdir
  "phoneAreaCode": "929",
  "language": "en-US"
}
```

### Test 3: Log-ları Yoxla

```bash
# Server log-larında bu mesajları görməlisiniz:
# ✅ "Auto-provisioning Twilio phone number"
# ✅ "Twilio phone number provisioned"
# ✅ "Auto-provisioning Retell AI agent"
# ✅ "Retell AI agent provisioned"
```

---

## 🔍 Call Routing Test

### Incoming Call Test

1. Twilio Console-da "Phone Numbers" bölməsinə gedin
2. Auto-provision edilmiş nömrəni tapın
3. Webhook URL-lərinin düzgün set olunduğunu yoxlayın:
   - Voice URL: `https://api.firstringai.com/api/ai-agent/incoming`
   - Status Callback: `https://api.firstringai.com/api/ai-agent/status`

4. Test zəngi edin və ya Twilio Test Call istifadə edin
5. Backend log-larında tenant-in tapıldığını yoxlayın

---

## 📊 Database-də Yoxlama

```sql
-- Provisioned tenant-ləri yoxla
SELECT
  id,
  name,
  "businessType",
  "twilioNumber",
  "retellAgentId",
  "createdAt"
FROM tenants
WHERE "twilioNumber" IS NOT NULL
  AND "retellAgentId" IS NOT NULL
ORDER BY "createdAt" DESC;

-- Statistika
SELECT
  COUNT(*) as total_tenants,
  COUNT("twilioNumber") as with_phone,
  COUNT("retellAgentId") as with_agent,
  COUNT(CASE WHEN "twilioNumber" IS NOT NULL AND "retellAgentId" IS NOT NULL THEN 1 END) as fully_provisioned
FROM tenants;
```

---

## ⚠️ Məlum Limitlər və Qeydlər

### 1. Twilio Limits
- Nömrə availability location-dan asılıdır
- Bəzi area code-larda nömrə olmaya bilər
- Monthly cost: ~$1 per number

### 2. Retell AI Limits
- API key valid olmalıdır
- Rate limiting ola bilər (high volume üçün)

### 3. Error Handling
- Provisioning fail olarsa tenant yenə də yaradılır
- Error-lar log edilir
- Manual retry mümkündür

### 4. Development Environment
- Test üçün `autoProvisionPhone: false` istifadə edin
- Production-da aktivləşdirin

---

## 🔄 Rollback Plan (Əgər problem olarsa)

### 1. Migration Rollback

```sql
-- retellAgentId column-u sil
ALTER TABLE tenants DROP COLUMN IF EXISTS "retellAgentId";
DROP INDEX IF EXISTS "tenants_retellAgentId_key";
DROP INDEX IF EXISTS "tenants_retellAgentId_idx";
```

### 2. Code Rollback

```bash
# Git-də əvvəlki versiyaya qayıt
git log --oneline | head -10
git revert <commit-hash>
```

### 3. Service Deactivation

```typescript
// leads.service.ts və tenants.service.ts-də comment out edin:
// const twilioNumber = await twilioProvisioningService...
// const retellAgentId = await retellProvisioningService...
```

---

## 📈 Gələcək Təkmilləşdirmələr

### Potential Features:
- [ ] Admin panel-də manual retry button
- [ ] Provisioning status dashboard
- [ ] Email notifications provisioning failure üçün
- [ ] Multi-region phone number support
- [ ] Cost tracking və billing integration
- [ ] Bulk provisioning endpoint
- [ ] Provisioning queue system (Redis-based)

---

## 📞 Support

Problem olduqda yoxlamaq lazım olanlar:

1. ✅ `.env` faylında `RETELL_API_KEY` varmı?
2. ✅ Database migration run olunubmu?
3. ✅ Prisma client regenerate edilib?
4. ✅ Server restart edilib?
5. ✅ Twilio account-da balance varmı?
6. ✅ Log-larda error mesajları varmı?

---

## ✅ Xülasə

**Əlavə olunan fayllar:**
- ✅ `src/services/twilio-provisioning.service.ts` (266 sətir)
- ✅ `src/services/retell-provisioning.service.ts` (508 sətir)
- ✅ `prisma/migrations/20251201083800_add_retell_agent_id/migration.sql`
- ✅ `docs/AUTO-PROVISIONING-SETUP.md` (958 sətir)
- ✅ `docs/CHANGELOG-AUTO-PROVISIONING.md` (bu fayl)

**Dəyişdirilmiş fayllar:**
- ✅ `prisma/schema.prisma` (+2 sətir)
- ✅ `src/modules/tenants/tenants.service.ts` (+70 sətir)
- ✅ `src/modules/leads/leads.service.ts` (+65 sətir)

**Ümumi kod:**
- **Yeni kod:** ~1,800+ sətir
- **Yeni funksiyalar:** 12
- **Dəyişdirilmiş funksiyalar:** 2

**Nəticə:**
✨ **Tam avtomatik müştəri onboarding sistemi hazırdır!**
