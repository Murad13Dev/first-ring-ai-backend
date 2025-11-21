# 🌍 Multi-Language Support Guide

## Supported Languages (10)

✅ **Azerbaijani** (az) - Azərbaycan
✅ **English** (en) - English
✅ **Russian** (ru) - Русский
✅ **Spanish** (es) - Español
✅ **Italian** (it) - Italiano
✅ **French** (fr) - Français
✅ **Chinese** (zh) - 中文
✅ **Japanese** (ja) - 日本語
✅ **Persian/Farsi** (fa) - فارسی
✅ **Filipino/Tagalog** (tl) - Tagalog

---

## 🎯 How It Works

### **Automatic Language Detection:**

The AI automatically detects the caller's language based on:
1. **Phone number country code** (primary)
2. **User preference** (if set)
3. **Default to Azerbaijani** (fallback)

```typescript
Country Code → Language
+994 → Azerbaijani
+1   → English
+7   → Russian
+34  → Spanish
+39  → Italian
+33  → French
+86  → Chinese
+81  → Japanese
+98  → Persian
+63  → Tagalog
```

### **Example Call Flow:**

```
📞 Call from +7 912 345 6789 (Russia)
   ↓
🤖 AI detects: Russian
   ↓
🗣️ "Здравствуйте! Добро пожаловать в Pizza House..."
   ↓
👤 "Я хочу заказать пиццу"
   ↓
🤖 AI responds in Russian
   "Что вы хотите заказать?"
```

---

## 🚀 API Endpoints

### **Get Supported Languages:**
```bash
curl http://localhost:5000/api/tenants/languages \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "az",
      "name": "Azerbaijani",
      "nativeName": "Azərbaycan"
    },
    {
      "code": "en",
      "name": "English",
      "nativeName": "English"
    },
    {
      "code": "ru",
      "name": "Russian",
      "nativeName": "Русский"
    }
    // ... 7 more
  ]
}
```

### **Set Tenant Default Language:**
```bash
curl -X PUT http://localhost:5000/api/tenants/{tenantId}/language \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ru"
  }'
```

### **Test Translation:**
```bash
curl -X POST http://localhost:5000/api/tenants/languages/test \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ru",
    "key": "greeting.welcome",
    "params": {
      "businessName": "Pizza House"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "ru",
    "key": "greeting.welcome",
    "translation": "Здравствуйте! Добро пожаловать в Pizza House. Чем могу помочь?"
  }
}
```

---

## 📝 Translation Keys

### **Greeting:**
```
greeting.welcome       - Welcome message
greeting.welcome_alt   - Alternative welcome
greeting.goodbye       - Goodbye message
greeting.hold          - Hold message
```

### **Booking:**
```
booking.ask_date       - Ask for date
booking.ask_time       - Ask for time
booking.ask_party_size - Ask how many people
booking.ask_name       - Ask for name
booking.confirmed      - Booking confirmed
booking.unavailable    - Time not available
```

### **Order:**
```
order.ask_items        - Ask what to order
order.ask_quantity     - Ask quantity
order.ask_delivery     - Delivery or pickup
order.confirm          - Order confirmed
```

### **FAQ:**
```
faq.hours              - Business hours
faq.location           - Address
faq.not_found          - No answer found
```

### **Errors:**
```
errors.not_understood  - Didn't understand
errors.technical       - Technical issue
errors.invalid_input   - Invalid input
```

---

## 🎨 Adding New Translations

### **1. Edit Translation File:**

Edit `/src/locales/{language}.json`:

```json
{
  "greeting": {
    "welcome": "Your translation here with {{businessName}}"
  }
}
```

### **2. Use in Code:**

```typescript
import i18nService from '../services/i18n.service';

const message = i18nService.t('ru', 'greeting.welcome', {
  businessName: 'Pizza House',
});

// Result: "Здравствуйте! Добро пожаловать в Pizza House..."
```

---

## 🌐 Twilio Speech Recognition

Each language has a specific Twilio language code:

```typescript
Language → Twilio Code
az → az-AZ
en → en-US
ru → ru-RU
es → es-ES
it → it-IT
fr → fr-FR
zh → zh-CN
ja → ja-JP
fa → fa-IR
tl → tl-PH
```

---

## 🤖 OpenAI System Prompts

Each language has a specific system prompt for GPT-4:

**Azerbaijani:**
```
"Siz Pizza House üçün AI köməkçisisiniz. 
Dost canlı və peşəkar olun. Azərbaycan dilində cavab verin."
```

**Russian:**
```
"Вы AI-ассистент для Pizza House. 
Будьте дружелюбны и профессиональны. Отвечайте на русском языке."
```

---

## 📊 Frontend Integration

### **For React/Vue/Angular:**

```typescript
// Get supported languages
const languages = await fetch('/api/tenants/languages');

// Display language selector
<select onChange={handleLanguageChange}>
  {languages.map(lang => (
    <option value={lang.code}>
      {lang.nativeName} - {lang.name}
    </option>
  ))}
</select>

// Set tenant language
await fetch(`/api/tenants/${tenantId}/language`, {
  method: 'PUT',
  body: JSON.stringify({ language: selectedLang })
});
```

### **Language Selector Component:**

```jsx
import { useState, useEffect } from 'react';

function LanguageSelector({ tenantId, currentLang, onChange }) {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    fetch('/api/tenants/languages')
      .then(res => res.json())
      .then(data => setLanguages(data.data));
  }, []);

  const handleChange = async (e) => {
    const newLang = e.target.value;
    
    await fetch(`/api/tenants/${tenantId}/language`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLang })
    });
    
    onChange(newLang);
  };

  return (
    <select value={currentLang} onChange={handleChange}>
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
}
```

---

## 🧪 Testing Different Languages

### **Test AI Agent:**

```bash
# Test in Russian
curl -X POST http://localhost:5000/api/ai-agent/test \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "userInput": "Я хочу заказать пиццу",
    "language": "ru"
  }'

# Test in Spanish
curl -X POST http://localhost:5000/api/ai-agent/test \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "userInput": "Quiero reservar una mesa",
    "language": "es"
  }'

# Test in Chinese
curl -X POST http://localhost:5000/api/ai-agent/test \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "userInput": "我想订餐",
    "language": "zh"
  }'
```

---

## 🔄 Real-World Examples

### **Example 1: Russian Customer**

```
📞 +7 912 345 6789 calls
🤖 "Здравствуйте! Добро пожаловать в Pizza House. Чем могу помочь?"
👤 "Я хочу заказать две пиццы маргарита"
🤖 "Отлично! Доставка или самовывоз?"
👤 "Доставка"
🤖 "Адрес доставки?"
👤 "улица Ленина 10"
🤖 "Ваш заказ готов! Итого: 1200 RUB. Ссылка на оплату отправлена в SMS."
```

### **Example 2: Spanish Customer**

```
📞 +34 612 345 678 calls
🤖 "¡Hola! Bienvenido a Pizza House. ¿Cómo puedo ayudarte?"
👤 "Quiero reservar una mesa para mañana"
🤖 "¿Para qué hora?"
👤 "Las ocho de la tarde"
🤖 "¿Para cuántas personas?"
👤 "Cuatro personas"
🤖 "¡Genial! Tu reserva está confirmada para mañana a las 20:00 para 4 personas."
```

### **Example 3: Chinese Customer**

```
📞 +86 138 0000 0000 calls
🤖 "您好！欢迎来到Pizza House。我能帮您什么？"
👤 "我想订餐"
🤖 "您想点什么？"
👤 "两个玛格丽特披萨"
🤖 "您的订单已准备好！总计：120元。付款链接已通过短信发送。"
```

---

## 📱 Mobile App Integration

### **Language Selection Screen:**

```dart
// Flutter example
DropdownButton<String>(
  value: selectedLanguage,
  items: languages.map((lang) {
    return DropdownMenuItem(
      value: lang['code'],
      child: Row(
        children: [
          Text(lang['nativeName']),
          SizedBox(width: 8),
          Text(lang['name'], style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }).toList(),
  onChanged: (value) {
    setState(() => selectedLanguage = value);
    updateTenantLanguage(value);
  },
)
```

---

## 🎯 Best Practices

1. **Always show language in native script:**
   - ✅ Русский, 中文, 日本語
   - ❌ Russian, Chinese, Japanese

2. **Auto-detect first, allow manual override:**
   - Start with phone number detection
   - Let user change if needed

3. **Keep translations natural:**
   - Use local expressions
   - Consider cultural differences

4. **Test with native speakers:**
   - Verify accuracy
   - Check tone and formality

---

## 🌟 Benefits

✅ **Global Reach:** Serve customers worldwide
✅ **Better Experience:** Customers speak their language
✅ **Higher Conversion:** People trust native language
✅ **Competitive Advantage:** Stand out from competitors
✅ **Easy to Maintain:** Centralized translations

---

Made with ❤️ by First Ring AI Team
