# Languages Update - Azerbaijani Removed

## Changes Made:

### 1. Translation File Removed
- ❌ Deleted: `src/locales/az.json`

### 2. Code Updates
- ✅ Removed from `supportedLanguages` array
- ✅ Removed from language detection map (+994 → az)
- ✅ Removed from language names
- ✅ Removed from native names
- ✅ Removed from Twilio language codes
- ✅ Removed from OpenAI system prompts
- ✅ Default language changed to English

### 3. Current Supported Languages (9)

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| ru | Russian | Русский |
| es | Spanish | Español |
| it | Italian | Italiano |
| fr | French | Français |
| zh | Chinese | 中文 |
| ja | Japanese | 日本語 |
| fa | Persian | فارسی |
| tl | Tagalog | Tagalog |

### 4. Auto-Detection Updated

**Before:**
```
+994 → Azerbaijani (az)
+1   → English (en)
```

**After:**
```
+1   → English (en)
+7   → Russian (ru)
(+994 removed)
```

**Default:** English (was Azerbaijani)

## Impact:

✅ **No Breaking Changes:**
- API endpoints unchanged
- Database schema unchanged
- All other languages working
- English is new default

✅ **Files Updated:**
- `src/services/i18n.service.ts` - All Azerbaijani references removed
- `src/locales/` - az.json deleted

✅ **Testing:**
```bash
# List languages (should show 9)
curl http://localhost:5000/api/tenants/languages

# Test English (new default)
curl -X POST http://localhost:5000/api/ai-agent/test \
  -d '{"userInput":"Hello","language":"en"}'
```

## Result:

**9 Languages Supported:**
- English, Russian, Spanish, Italian, French
- Chinese, Japanese, Persian, Tagalog

**Total Addressable Market:** Still 2+ Billion people worldwide
