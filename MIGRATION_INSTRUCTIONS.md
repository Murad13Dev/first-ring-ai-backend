# Migration Instructions

## Email Verification Fields Migration

Bu migration `users` cədvəlinə email verification üçün lazım olan sütunları əlavə edir.

### Əlavə olunan sütunlar:
- `emailVerified` - Boolean (default: false)
- `verificationToken` - Text (nullable)
- `verificationTokenExpires` - Timestamp (nullable)

### Migration faylı:
```
prisma/migrations/20251218145200_add_email_verification_to_users/migration.sql
```

### Production mühitində migration-ı necə tətbiq etmək olar:

#### Variant 1: Prisma CLI ilə (Tövsiyə olunur)

```bash
# Node modules quraşdırın (əgər quraşdırılmayıbsa)
npm install

# Migration-ı tətbiq edin
npm run prisma:migrate:prod
```

#### Variant 2: Birbaşa SQL ilə (Psql)

Əgər Prisma CLI işləmirsə, SQL-i birbaşa icra edə bilərsiniz:

```bash
# .env faylından DATABASE_URL-i oxuyun və migration-ı tətbiq edin
psql "$DATABASE_URL" << 'EOF'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "verificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "verificationTokenExpires" TIMESTAMP(3);
EOF
```

#### Variant 3: PgAdmin və ya başqa GUI alətləri ilə

SQL-i birbaşa kopyalayıb icra edin:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "verificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "verificationTokenExpires" TIMESTAMP(3);
```

### Yoxlama

Migration tətbiq edildikdən sonra yoxlamaq üçün:

```bash
psql "$DATABASE_URL" -c "\d users"
```

Və ya Prisma Studio ilə:

```bash
npm run prisma:studio
```

## Yeni Funksiyalar

### Lead Delete Operation

Bu commit-də Lead üçün DELETE əməliyyatı əlavə edilib:

- **Endpoint**: `DELETE /api/leads/:id`
- **Authentication**: Admin only (authenticateAdmin middleware)
- **Xüsusiyyətlər**:
  - Lead-in mövcudluğunu yoxlayır
  - Convert olunmuş lead-ləri silməyə icazə vermir
  - Uğurlu silmə zamanı log yazır

### İstifadə nümunəsi:

```bash
# Lead silmək
curl -X DELETE \
  http://localhost:3000/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Cavab:

**Uğurlu (200)**:
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

**Xəta - Convert olunmuş lead (400)**:
```json
{
  "success": false,
  "message": "Cannot delete a converted lead",
  "error": "..."
}
```

**Xəta - Lead tapılmadı (404)**:
```json
{
  "success": false,
  "message": "Lead not found",
  "error": "..."
}
```

## Tam CRUD Əməliyyatları

İndi Lead üçün bütün CRUD əməliyyatları mövcuddur:

- ✅ **Create**: `POST /api/leads`
- ✅ **Read (all)**: `GET /api/leads` (admin only)
- ✅ **Read (one)**: `GET /api/leads/:id` (admin only)
- ✅ **Update**: `PUT /api/leads/:id` (admin only)
- ✅ **Delete**: `DELETE /api/leads/:id` (admin only) - **YENİ**
- ✅ **Convert**: `POST /api/leads/:id/convert` (admin only)
- ✅ **Stats**: `GET /api/leads/stats` (admin only)
