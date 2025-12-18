# Retell AI Manual Setup Guide

## 📋 Hazırlıq

### 1. Lazım olan hesablar:
- ✅ Twilio hesabı (mövcud)
- ✅ Retell AI hesabı (https://retellai.com)
- ✅ Backend API URL (məsələn: https://api.firstringai.com)

### 2. API Keys:
Əvvəlcə aşağıdakı key-ləri toplayın:

```bash
# .env faylından
TWILIO_ACCOUNT_SID=ACxxxx...
TWILIO_AUTH_TOKEN=xxxx...
RETELL_API_KEY=key_xxxx...
API_URL=https://api.firstringai.com
```

---

## 🔧 HƏR MÜŞTƏRİ ÜÇÜN SETUP (5 dəfə təkrarlamaq)

### ADDIM 1: Tenant məlumatlarını yığın

Backend admin panelindən və ya database-dən:

```
Müştəri 1:
- Tenant ID: ______________
- Ad: ______________
- Twilio Number: ______________
- Retell Agent ID: ______________
```

**Database-dən necə çıxarmaq:**

```bash
# Backend directory-də:
npx ts-node -e "
import prisma from './src/config/database';
async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, twilioNumber: true, retellAgentId: true }
  });
  console.table(tenants);
}
main();
"
```

---

### ADDIM 2: Retell Dashboard-a gir

1. **Retell Dashboard aç:**
   - URL: https://dashboard.retellai.com
   - Login ol

2. **Sol menyudan "Phone Numbers" bölməsinə get**

---

### ADDIM 3: Phone Number əlavə et

1. **"Add Phone Number" düyməsinə klikə**

2. **Formu doldur:**
   ```
   Provider: Twilio
   Phone Number: [Tenant-in Twilio nömrəsi, məs: +15551234567]
   ```

3. **Agent Selection:**
   ```
   Select Agent: [Tenant-in Retell Agent-ini seç]

   Məsələn: "Spa Relax AI Agent"
   ```

4. **Webhook Configuration:**
   ```
   Inbound Webhook URL: https://api.firstringai.com/api/retell/webhook
   ```

5. **"Save" düyməsinə bas**

---

### ADDIM 4: Twilio Webhook yenilə

Bu çox **VACİBDİR** - əks halda zənglər işləməz!

1. **Twilio Console aç:**
   - URL: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
   - Login ol

2. **Tenant-in phone number-ini tap**
   - Məsələn: +1 (555) 123-4567

3. **Configure düyməsinə bas**

4. **Voice & Fax bölməsində:**
   ```
   A CALL COMES IN:

   Webhook:  [Select]
   URL: https://api.retellai.com/create-phone-call
   Method: POST [Select]
   ```

5. **"Save Configuration" düyməsinə bas**

---

### ADDIM 5: Test et

1. **Tenant-in nömrəsinə zəng vur:**
   - Mobil telefonundan tenant-in Twilio nömrəsinə zəng et

2. **Yoxla:**
   - ✅ Retell AI səsi eşidilir (alice voice)
   - ✅ Tenant-specific greeting: "Hello! Thank you for calling [Business Name]..."
   - ✅ AI cavab verir

3. **Backend logs yoxla:**
   ```bash
   # Terminal-da:
   pm2 logs

   # Görməlisiniz:
   # "Retell webhook received", event: "call_started"
   # "Retell function call", function_name: "check_availability"
   ```

4. **Retell Dashboard-da zəng görünür:**
   - Dashboard → Calls → Son zəngi görməlisiniz

---

## 📊 BÜTÜN 5 MÜŞTƏRİ ÜÇÜN CHECKLİST

| # | Tenant Adı | Twilio Number | Retell Registered | Twilio Webhook Updated | Tested |
|---|------------|---------------|-------------------|------------------------|--------|
| 1 | __________ | _____________ | ☐                 | ☐                      | ☐      |
| 2 | __________ | _____________ | ☐                 | ☐                      | ☐      |
| 3 | __________ | _____________ | ☐                 | ☐                      | ☐      |
| 4 | __________ | _____________ | ☐                 | ☐                      | ☐      |
| 5 | __________ | _____________ | ☐                 | ☐                      | ☐      |

---

## 🐛 TROUBLESHOOTİNG

### Problem 1: Retell Dashboard-da agent-lər görünmür

**Həll:**
```bash
# Backend-də agent-ləri yoxla:
curl -X GET https://api.retellai.com/v2/list-agents \
  -H "Authorization: Bearer YOUR_RETELL_API_KEY"

# Əgər boşdursa, agent yarat:
npm run seed  # və ya
npx ts-node scripts/create-retell-agents.ts
```

---

### Problem 2: Zəng edirsən amma cavab vermir

**Yoxla:**
1. ✅ Twilio webhook URL düzgündürmü?
   - `https://api.retellai.com/create-phone-call`
2. ✅ Phone number Retell-də registered olubmu?
3. ✅ Backend API_URL environment variable düzgündürmü?

**Debug:**
```bash
# Twilio logs:
# https://console.twilio.com/us1/monitor/logs/calls

# Retell logs:
# https://dashboard.retellai.com/calls

# Backend logs:
pm2 logs --lines 100
```

---

### Problem 3: AI düzgün müştəri məlumatlarını işlətmir

**Yoxla:**
1. Retell webhook backend-ə çatırı?
   ```bash
   # Backend logs-da görməlisiniz:
   grep "Retell webhook" logs/combined.log
   ```

2. TenantId düzgün ötürülür?
   ```bash
   # Retell agent config-də metadata var?
   curl -X GET https://api.retellai.com/v2/get-agent/AGENT_ID \
     -H "Authorization: Bearer YOUR_RETELL_API_KEY"
   ```

---

## ⏱️ VAXT TƏXMİNİ

- Hazırlıq: 5 dəqiqə
- Hər müştəri üçün setup: 5 dəqiqə
- **Cəmi 5 müştəri: ~30 dəqiqə**

---

## ✅ SETUP TAMAMLANANDAN SONRA

1. ✅ Hər 5 müştəri test edilib
2. ✅ Retell Dashboard-da 5 phone number registered
3. ✅ Twilio-da 5 webhook Retell-ə yönəldilib
4. ✅ Backend logs təmiz (error yoxdur)

**Növbəti addım:** Production-a deploy et! 🚀

---

## 📞 ƏLAVƏ KÖMƏK

Əgər problem olarsa:
- Retell Docs: https://docs.retellai.com
- Twilio Docs: https://www.twilio.com/docs
- Backend logs: `pm2 logs`
