# 🔥 HOTFIX: Build Errors - Dərhal Tətbiq Edin

## ✅ NƏ DƏYİŞDİ?

Schema.prisma-da 2 düzəliş edildi:

### 1. Lead modeline `aiCallData` əlavə edildi
```prisma
model Lead {
  // ...
  aiCallData Json? // ← YENİ field
  // ...
}
```

### 2. Booking modelində optional fieldlər
```prisma
model Booking {
  // ...
  tenantId      String?   // ← İndi optional
  tenant        Tenant?   // ← İndi optional
  customerPhone String?   // ← İndi optional
  // ...
}
```

---

## 🚀 SERVER-də Tətbiq Etmək (3 Komanda)

```bash
# 1. Pull latest code
git pull origin claude/retail-ai-prompt-01J8bL7ij4qpZQ4vYQSDEPbK

# 2. Prisma client regenerate et
npx prisma generate

# 3. Migration run et
npx prisma migrate deploy

# 4. Build et
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## 📊 Migration SQL (Avtomatik Run Olunacaq)

Migration faylı artıq yaradılıb:
`prisma/migrations/20251203081233_add_aicalldata_and_optional_booking_fields/migration.sql`

İçində olan SQL:
```sql
-- Add aiCallData to leads
ALTER TABLE "leads" ADD COLUMN "aiCallData" JSONB;

-- Make booking fields optional
ALTER TABLE "bookings" ALTER COLUMN "customerPhone" DROP NOT NULL;
ALTER TABLE "bookings" ALTER COLUMN "tenantId" DROP NOT NULL;
```

---

## ✅ Build Uğurlu Olduqdan Sonra

```bash
# PM2 restart (production)
pm2 restart first-ring-ai-backend

# və ya development
npm run dev
```

---

## 🔍 Yoxlamaq

```bash
# Build output-da səhv olmamalıdır:
# ✅ Compiled successfully

# Database-də yoxla:
psql -d firstringdb -c "\d leads" | grep aiCallData
psql -d firstringdb -c "\d bookings" | grep customerPhone
```

---

## ⚠️ Əgər Hələ də Səhv Olarsa

### Problem: "prisma generate" fail olur

**Həll:**
```bash
# Prisma cache-i təmizlə
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

### Problem: Migration fail olur

**Həll:**
```bash
# Migration status-u yoxla
npx prisma migrate status

# Əgər migration pending-dirsə:
npx prisma migrate resolve --applied "20251203081233_add_aicalldata_and_optional_booking_fields"
```

---

## 📝 Qeyd

Bu hotfix TypeScript build error-larını düzəldir:
- ✅ `retellAgentId does not exist` - Artıq yoxdur (əvvəlki migrationda düzəldildi)
- ✅ `aiCallData does not exist` - Düzəldildi
- ✅ `customerPhone missing` - Düzəldildi (optional edildi)

---

## 🎯 Son Status

İndi bu komandaları run edin və build uğurlu olmalıdır! 🚀
