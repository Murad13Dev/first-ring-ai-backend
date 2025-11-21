# 🚀 First Ring AI Backend - Quick Start Guide

## ⚡ Tez Başlanğıc (5 dəqiqə)

### 1. Proyekti yüklə və aç

```bash
# Extract archive
tar -xzf first-ring-ai-backend.tar.gz
cd first-ring-ai-backend

# Install dependencies
npm install
```

### 2. Environment setup

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
nano .env
```

**Minimum tələb olunan dəyərlər:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/first_ring_ai"
JWT_SECRET=your-random-secret-key-here
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SALES_EMAIL=sales@yourcompany.com
```

### 3. Database quraşdırma

**Variant A: Docker ilə (ən asan)**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait 10 seconds
sleep 10

# Run migrations
npm run prisma:migrate
```

**Variant B: Local PostgreSQL**
```bash
# PostgreSQL-də database yarat
createdb first_ring_ai

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### 4. İlk admin istifadəçi yarat

```bash
# Option 1: Prisma Studio UI
npm run prisma:studio
# Browser açılacaq, AdminUser table-a daxil ol və yarat

# Option 2: SQL ilə
psql first_ring_ai
```

```sql
INSERT INTO admin_users (id, email, password_hash, name, role) 
VALUES (
  gen_random_uuid(),
  'admin@firstringai.com',
  '$2a$10$YourHashedPasswordHere', -- Use bcrypt to generate
  'Admin User',
  'superadmin'
);
```

**Şifrə hash yaratmaq üçün:**
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

### 5. Serveri başlat

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

Server **http://localhost:5000** ünvanında işə düşəcək.

---

## 🧪 Test etmək

### Health check
```bash
curl http://localhost:5000/health
```

**Gözlənilən cavab:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-11-20T10:30:00.000Z"
}
```

### Admin login test
```bash
curl -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@firstringai.com","password":"your-password"}'
```

### Lead yaratmaq (test)
```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "source": "landing_page_form",
    "contactName": "Test User",
    "email": "test@example.com",
    "phone": "+994501234567",
    "businessName": "Test Restaurant",
    "businessType": "restaurant",
    "selectedPlan": "pro",
    "callVolume": 30
  }'
```

---

## 📁 Vacib fayllar

```
first-ring-ai-backend/
├── .env                    # Environment variables (YARATMALISAN!)
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── server.ts           # Main entry point
│   ├── config/             # Config files
│   ├── middleware/         # Middleware
│   └── modules/            # Feature modules
├── Dockerfile              # Docker build
├── docker-compose.yml      # Docker services
└── README.md               # Full documentation
```

---

## 🐛 Problemlərin həlli

### Port artıq istifadədədir
```bash
# Port-u dəyiş .env faylında
PORT=5001
```

### Database connection error
```bash
# PostgreSQL işə düşdüyünü yoxla
pg_isready

# Database_URL doğrudur?
echo $DATABASE_URL
```

### Prisma client error
```bash
# Client-i yenidən generate et
npm run prisma:generate
```

### Cannot find module errors
```bash
# node_modules-u sil və yenidən install et
rm -rf node_modules
npm install
```

---

## 📊 İlk Lead yaradanda nə olur?

1. ✅ Lead database-də saxlanılır
2. 📧 Admin-ə email göndərilir (SALES_EMAIL)
3. 📱 Lead-ə confirmation email göndərilir
4. 🎯 Qualification score hesablanır
5. 🔥 Priority təyin edilir (hot/high/normal/low)

**Admin email təsdiqi üçün Gmail setup:**

1. Gmail-də 2-Factor Authentication aktivləşdir
2. App Password yarat: https://myaccount.google.com/apppasswords
3. .env faylında:
```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
```

---

## 🚀 Production-a Deploy

### AWS EC2 (tövsiyə)

```bash
# 1. EC2 instance-ə SSH
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 4. Clone və setup
git clone <your-repo>
cd first-ring-ai-backend
npm install
npm run build

# 5. PM2 ilə run et
npm install -g pm2
pm2 start dist/server.js --name first-ring-ai
pm2 save
pm2 startup
```

### Docker ilə (daha asan)

```bash
# Build image
docker build -t first-ring-ai-backend .

# Run container
docker run -d \
  -p 5000:5000 \
  --name first-ring-ai-backend \
  --env-file .env \
  first-ring-ai-backend

# Check logs
docker logs -f first-ring-ai-backend
```

---

## 📞 Əlaqə və Dəstək

**Problemlə qarşılaşdınız?**
- README.md oxuyun
- Logs yoxlayın: `logs/error.log`
- Docker logs: `docker-compose logs backend`

**Feature request?**
- Issue açın GitHub-da
- Email: dev@firstringai.com

---

## ✅ Növbəti addımlar

Backend işə düşdükdən sonra:

1. ✅ Frontend quraşdır (Next.js)
2. ✅ Twilio account yarat və integrate et
3. ✅ Retell AI setup
4. ✅ Stripe account konfiqurasiya et
5. ✅ Google APIs aktivləşdir
6. ✅ Production-da test et
7. ✅ İlk müştərini onboard et! 🎉

---

**Uğurlar! 🚀**

First Ring AI Development Team
