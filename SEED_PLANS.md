# Plan Seed Guide

Database-də Plan table-ı boşdursa, bu təlimatlardan istifadə edərək seed edə bilərsiniz.

## Metodlar

### Method 1: API Endpoint (Server işləyirsə)

Server işləyirsə və çalışırsa, sadəcə bu endpoint-i çağırın:

```bash
curl -X POST http://localhost:5000/api/subscriptions/plans/seed
```

### Method 2: SQL Script (Tövsiyə olunur)

Birbaşa PostgreSQL-də çalışdırın:

```bash
# Database connection məlumatları .env faylından
psql $DATABASE_URL -f prisma/seed-plans.sql
```

Və ya:

```bash
psql -U username -d dbname -f prisma/seed-plans.sql
```

### Method 3: TypeScript Seed Script

Əgər Prisma client düzgün generate olunubsa:

```bash
npm run seed:plans
```

## Nəticə

4 plan yaradılacaq:

| Plan | Price | Phone Lines | Minutes | Overage Rate |
|------|-------|-------------|---------|--------------|
| **Starter** | $500/mo | 1 | 1,000 | $0.75/min |
| **Professional** | $1,500/mo | 3 | 3,000 | $0.75/min |
| **Enterprise** | $3,000/mo | 10 | 6,000 | $0.60/min |
| **Executive** | $5,000/mo | Unlimited | 12,000 | $0.50/min |

## Yoxlamaq

Plans-ları yoxlamaq üçün:

```bash
# API ilə
curl http://localhost:5000/api/subscriptions/plans

# SQL ilə
psql $DATABASE_URL -c "SELECT slug, name, price FROM \"Plan\" ORDER BY price;"
```

## Qeyd

- SQL script `ON CONFLICT` istifadə edir, yəni əgər plan artıq mövcuddursa, update edəcək
- Mövcud planları silmək istəmirsinizsə, SQL faylındakı `DELETE FROM "Plan";` sətirini silməyin (artıq comment-də)
