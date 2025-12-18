# 🎯 RETELL AI MANUAL SETUP - ÇOX SADƏ İZAH

## 📦 NƏ LAZIMDIR?

1. ✅ Retell AI hesabı (https://retellai.com - qeydiyyatdan keç)
2. ✅ Twilio hesabı (artıq var)
3. ✅ 30 dəqiqə vaxt

---

## 🚀 5 MÜŞTƏRİ ÜÇÜN SETUP

### HƏR MÜŞTƏRİ ÜÇÜN BU 3 ADDIMI TƏKRARLAYıN:

---

## ⭐ ADDIM 1: Müştəri məlumatlarını tap

**Terminal-da bu əmri işlət:**

```bash
cd /home/user/first-ring-ai-backend
node scripts/list-tenants.js
```

**Nəticə belə görünəcək:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Spa Relax
   Business Type: spa
   ✅ Twilio Number: +15551234567
   ✅ Retell Agent: agent_abc123xyz
   Tenant ID: uuid-xxxx-yyyy-zzzz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Bu 2 məlumatı köçür:**
- 📞 **Twilio Number:** +15551234567
- 🤖 **Retell Agent ID:** agent_abc123xyz

---

## ⭐ ADDIM 2: Retell Dashboard-da Phone Number qoş

### 2.1 Retell-ə daxil ol

1. Brauzerdə aç: **https://dashboard.retellai.com**
2. Email və şifrə ilə daxil ol

### 2.2 Phone Number əlavə et

1. **Sol tərəfdə menyudan** tapın: **"Phone Numbers"** ← Bura klikə

2. **Sağ yuxarıda** tapın: **"+ Add Phone Number"** düyməsi ← Bura klikə

3. **Form açılacaq, doldur:**

```
┌─────────────────────────────────────────┐
│  Provider: [Twilio ▼]  <-- Seç          │
│                                          │
│  Phone Number:                           │
│  [+15551234567]  <-- ADDIM 1-dən köçür  │
│                                          │
│  Agent:                                  │
│  [agent_abc123xyz ▼]  <-- Seç          │
│                                          │
│  Inbound Webhook URL:                    │
│  [https://api.firstringai.com/api/retell/webhook]  │
│                                          │
│  [ Save ]  <-- Bura bas                 │
└─────────────────────────────────────────┘
```

4. **"Save" düyməsinə bas**

✅ **Hazır!** Retell Dashboard-da phone number qeydiyyatdan keçdi.

---

## ⭐ ADDIM 3: Twilio Webhook-u dəyiş

### 3.1 Twilio Console-a daxil ol

1. Brauzerdə aç: **https://console.twilio.com**
2. Daxil ol

### 3.2 Phone Number tapın

1. **Sol menyuda** tap: **Phone Numbers → Manage → Active numbers**

2. **Axtarış** et: `+15551234567` (ADDIM 1-dən nömrəni yaz)

3. **Nömrəyə klikə** (açılacaq)

### 3.3 Webhook URL dəyiş

1. **Aşağı scroll et** "Voice Configuration" bölməsinə qədər

2. **Tap:**

```
A CALL COMES IN
├─ [ ] TwiML App
├─ [✓] Webhook  <-- Bu seçilməlidir
│
├─ URL: [____________________] [POST ▼]
│       ↑
│       Bu boşluğa yaz:
│       https://api.retellai.com/create-phone-call
│
└─ Method: [POST ▼]  <-- POST seçilməlidir
```

3. **Köhnə URL (silinməlidir):**
   ```
   https://api.firstringai.com/api/ai-agent/incoming
   ```

4. **Yeni URL (yazılmalıdır):**
   ```
   https://api.retellai.com/create-phone-call
   ```

5. **Ən aşağıda** tapın: **"Save Configuration"** düyməsi ← Bura bas

✅ **Hazır!** Twilio indi zəngləri Retell-ə yönləndirəcək.

---

## ⭐ ADDIM 4: Test et

### 4.1 Zəng et

1. **Mobil telefonu götür**
2. **Nömrəni yığ:** +15551234567 (müştərinin Twilio nömrəsi)
3. **Gözlə...**

### 4.2 Nə gözləməlisiniz:

```
🔔 Zəng çalır...
🤖 "Hello! Thank you for calling Spa Relax..."
💬 "How can I help you today?"
```

### 4.3 Danış:

Sən deyirsən:
> "I want to book a massage for tomorrow"

AI cavab verir:
> "Great! What time would you prefer?"

✅ **İşləyir!** Retell AI aktiv və müştəri məlumatları ilə danışır.

---

## 📋 5 MÜŞTƏRİ ÜÇÜN CHECKLİST

Hər müştəri üçün bu 3 addımı təkrarla:

```
☐ Müştəri 1: _______________
   ☐ ADDIM 1: Məlumatları tapdım
   ☐ ADDIM 2: Retell-ə qoşdum
   ☐ ADDIM 3: Twilio webhook dəyişdim
   ☐ ADDIM 4: Test etdim ✅

☐ Müştəri 2: _______________
   ☐ ADDIM 1: Məlumatları tapdım
   ☐ ADDIM 2: Retell-ə qoşdum
   ☐ ADDIM 3: Twilio webhook dəyişdim
   ☐ ADDIM 4: Test etdim ✅

☐ Müştəri 3: _______________
   ☐ ADDIM 1: Məlumatları tapdım
   ☐ ADDIM 2: Retell-ə qoşdum
   ☐ ADDIM 3: Twilio webhook dəyişdim
   ☐ ADDIM 4: Test etdim ✅

☐ Müştəri 4: _______________
   ☐ ADDIM 1: Məlumatları tapdım
   ☐ ADDIM 2: Retell-ə qoşdum
   ☐ ADDIM 3: Twilio webhook dəyişdim
   ☐ ADDIM 4: Test etdim ✅

☐ Müştəri 5: _______________
   ☐ ADDIM 1: Məlumatları tapdım
   ☐ ADDIM 2: Retell-ə qoşdum
   ☐ ADDIM 3: Twilio webhook dəyişdim
   ☐ ADDIM 4: Test etdim ✅
```

---

## 🐛 PROBLEMLƏRİN HƏLLİ

### ❌ Problem: "Agent seçə bilmirəm, siyahı boşdur"

**Səbəb:** Retell-də agent yaradılmayıb.

**Həll:**
```bash
# Backend-də:
cd /home/user/first-ring-ai-backend

# Tenant-lər üçün agent yarat:
npm run create-agents
```

---

### ❌ Problem: "Zəng edirəm amma Retell cavab vermir"

**Yoxla:**

1. ✅ Twilio webhook düzdürmü?
   - Console.twilio.com → Phone Numbers → Nömrəni aç
   - URL: `https://api.retellai.com/create-phone-call` olmalıdır

2. ✅ Phone number Retell-də var?
   - Dashboard.retellai.com → Phone Numbers
   - Nömrəni görürsənmi?

3. ✅ Internetiniz işləyir?

---

### ❌ Problem: "AI cavab verir amma səhv müştəri məlumatları deyir"

**Səbəb:** Retell agent və phone number düzgün qoşulmayıb.

**Həll:**
1. Retell Dashboard → Phone Numbers
2. Nömrəni tap
3. Düzgün agent-i seçibmi yoxla
4. Webhook URL düzdürmü yoxla

---

## ⏱️ VAXT

- **1 müştəri setup:** 5-7 dəqiqə
- **5 müştəri setup:** 25-35 dəqiqə
- **Test:** 10 dəqiqə

**Cəmi:** ~45 dəqiqə

---

## ✅ BİTİRDİKDƏN SONRA

Bütün 5 müştəri üçün:
- ✅ Retell-də phone number qeydiyyatdan keçib
- ✅ Twilio webhook Retell-ə yönəldilib
- ✅ Test zəngləri işləyir
- ✅ AI düzgün müştəri məlumatları ilə danışır

**Təbrik edirəm! 🎉 Retell AI tam aktiv!**

---

## 📞 KOMƏK LAZIM?

Əgər bir şey anlamadınsa:

1. **Screenshotlar göstər** - mən daha dəqiq kömək edərəm
2. **Log-ları göndər** - backend logs yoxlayaq
3. **Zəng qeydiyyatını göstər** - Retell/Twilio dashboard-dan

Uğurlar! 🚀
