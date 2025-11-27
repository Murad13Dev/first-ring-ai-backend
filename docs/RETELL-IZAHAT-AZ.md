# 🇦🇿 Retell AI Sales Agent - Azərbaycanca İzahat

## Retell AI JSON funksiyaları harada təyin edilir?

### QISA CAVAB:

JSON funksiyaları **Retell AI Dashboard**-da təyin edilir, backend-də deyil.

---

## ADDIM-ADDIM İZAHAT:

### 1️⃣ Retell AI Dashboard-da Agent Yaradırsan

```
https://dashboard.retellai.com → Create Agent
```

---

### 2️⃣ "Functions" Bölməsində JSON Təyin Edirsən

Retell Dashboard-da "Add Function" düyməsinə basıb hər funksiyanı ayrı-ayrı əlavə edirsən:

**Funksiya 1:**
```json
{
  "name": "create_sales_lead",
  "description": "Creates a lead in database",
  "parameters": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string" },
      "businessName": { "type": "string" }
    },
    "required": ["name", "email", "businessName"]
  }
}
```

**Funksiya 2:**
```json
{
  "name": "send_pricing_packages",
  "parameters": { ... }
}
```

...və s.

---

### 3️⃣ Webhook URL Qeyd Edirsən

Retell Dashboard-da "Webhook URL" bölməsinə yazırsan:

```
https://your-domain.com/api/retell/general-functions
```

⚠️ **Diqqət:** Localhost işləməz! Canlı URL lazımdır (ngrok və ya production server).

---

### 4️⃣ Retell AI Necə Bizim Backend-ə Zəng Edir?

```
┌─────────────────────────────────────────────────────────┐
│  Müştəri zəng edir                                      │
│        ↓                                                 │
│  Retell AI agent cavab verir                            │
│        ↓                                                 │
│  AI deyir: "Emailinizi verə bilərsiniz?"                │
│        ↓                                                 │
│  Müştəri: "sarah@example.com"                           │
│        ↓                                                 │
│  AI başa düşür ki lazımi məlumatlar toplandı            │
│        ↓                                                 │
│  AI QƏRAR VERİR: create_sales_lead() çağırmalıyam       │
│        ↓                                                 │
│  Retell AI SERVER POST request göndərir:                │
│                                                          │
│  POST https://your-domain.com/api/retell/general-functions
│  {                                                       │
│    "function_name": "create_sales_lead",                │
│    "args": {                                            │
│      "name": "Sarah",                                   │
│      "email": "sarah@example.com",                      │
│      "businessName": "Smile Dental"                     │
│    }                                                    │
│  }                                                      │
│        ↓                                                 │
│  Bizim Backend qəbul edir                               │
│        ↓                                                 │
│  retellController.generalFunctions() işə düşür          │
│        ↓                                                 │
│  retellService.createSalesLead() çağırılır              │
│        ↓                                                 │
│  Lead bazaya yazılır                                    │
│        ↓                                                 │
│  Backend cavab qaytarır:                                │
│  { success: true, leadId: "abc123", message: "..." }   │
│        ↓                                                 │
│  Retell AI cavabı alır                                  │
│        ↓                                                 │
│  AI müştəriyə deyir:                                    │
│  "Əla! Məlumatlarınız qeydə alındı..."                 │
└─────────────────────────────────────────────────────────┘
```

---

## Backend-də Nə Edirsən?

### Sadəcə 3 şey:

1. **DTO (Data Transfer Object) yaradırsan** - Funksiya parametrləri üçün TypeScript type
   ```typescript
   // dto/sales-agent-functions.dto.ts
   export interface CreateSalesLeadDto {
     name: string;
     email: string;
     businessName: string;
     // ...
   }
   ```

2. **Service-də funksiya handler yazırsan** - Gələn datanı işləyir
   ```typescript
   // retell.service.ts
   async createSalesLead(data: CreateSalesLeadDto) {
     const lead = await prisma.lead.create({ data: {...} });
     return { success: true, leadId: lead.id };
   }
   ```

3. **Controller-də route qeyd edirsən** - Webhook qəbul edir
   ```typescript
   // retell.controller.ts
   async generalFunctions(req, res) {
     const { function_name, args } = req.body;
     const result = await retellService.handleGeneralFunction(function_name, args);
     res.json(result);
   }
   ```

---

## Yəni JSON-lar harada?

### ❌ Backend-də DEYİL!

Backend-də sadəcə funksiyaların **icraçıları (handlers)** var.

### ✅ Retell AI Dashboard-da!

JSON schema-lar Retell AI dashboard-da təyin edilir ki AI nə zaman hansı funksiyanı çağırsın və hansı parametrlərlə çağırsın bilsin.

---

## Praktik Misal:

### 1. Retell Dashboard-da yazırsan:

```json
{
  "name": "send_pricing_packages",
  "description": "Sends pricing to customer email",
  "parameters": {
    "type": "object",
    "properties": {
      "email": { "type": "string" },
      "customerName": { "type": "string" }
    },
    "required": ["email"]
  }
}
```

### 2. AI danışır:

```
AI: "Əla! Pricing paketlərini göndərəcəm."
AI (daxili): Hmm, mənə email lazımdır. Müştəridən email aldım: sarah@test.com
AI (daxili): İndi send_pricing_packages() çağırmalıyam!
```

### 3. Retell AI POST göndərir:

```http
POST https://your-backend.com/api/retell/general-functions
Content-Type: application/json

{
  "function_name": "send_pricing_packages",
  "args": {
    "email": "sarah@test.com",
    "customerName": "Sarah"
  }
}
```

### 4. Backend icra edir:

```typescript
async sendPricingPackages(data) {
  // Email göndər
  await emailService.send(data.email, pricingPDF);
  return {
    success: true,
    message: "Email sent to " + data.email
  };
}
```

### 5. AI cavabı müştəriyə çatdırır:

```
AI: "Əla! Pricing paketləri sarah@test.com ünvanına göndərildi. 2 dəqiqə ərzində alacaqsınız."
```

---

## Tez-Tez Verilən Suallar:

### S: Backend-də JSON schema yazmaq lazımdırmı?

**C:** Xeyr! Retell Dashboard-da yazırsan. Backend sadəcə icra edir.

---

### S: Webhook URL harada qeyd edilir?

**C:** Retell AI Dashboard → Agent Settings → Functions → Webhook URL

---

### S: Localhost URL işləyəcəkmi?

**C:** Xeyr! Retell AI sizin local kompüterinizə çata bilməz. İstifadə et:
- **ngrok** (development üçün): `ngrok http 5000`
- **Production server** (real işləmə üçün): `https://api.yoursite.com`

---

### S: Funksiya çağırılmırsa nə etməli?

**C:**
1. Webhook URL düzgün yazılıbmı yoxla (Retell Dashboard)
2. Server işləyirmi yoxla: `curl https://your-url.com/api/retell/general-functions`
3. Logları bax: `tail -f logs/app.log`
4. Retell-də "Function Calling" enabled-dimi yoxla

---

### S: Test necə edim?

**C:** 2 yol var:

**Yol 1 - Real zəng:**
```
Retell nömrəsini zəng et → AI ilə danış → Database yoxla
```

**Yol 2 - Postman/curl:**
```bash
curl -X POST http://localhost:5000/api/retell/general-functions \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "create_sales_lead",
    "args": {
      "name": "Test User",
      "email": "test@example.com",
      "businessName": "Test Business",
      "businessType": "restaurant"
    }
  }'
```

---

## Xülasə:

| Nə                        | Harada                  | Nə üçün                                |
|---------------------------|-------------------------|----------------------------------------|
| JSON Schema               | Retell Dashboard        | AI-a izah edir nə zaman çağırsın       |
| Webhook URL               | Retell Dashboard        | AI-a deyir hara POST göndərsin         |
| Function Handlers         | Backend (service.ts)    | Gələn requestləri icra edir            |
| Route/Controller          | Backend (controller.ts) | Webhook-ı qəbul edir                   |
| Database Logic            | Backend (Prisma)        | Məlumatı yadda saxlayır                |

---

**Uğurlar! 🚀**

Sualınız varsa soruşa bilərsiniz.
