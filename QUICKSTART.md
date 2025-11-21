# 🚀 First Ring AI Backend - Quick Start Guide

## ⚡ Quick Start (5 minutes)

### 1. Download and extract project

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

**Minimum required values:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/first_ring_ai"
JWT_SECRET=your-random-secret-key-here
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SALES_EMAIL=sales@yourcompany.com
```

### 3. Database setup

**Option A: With Docker (easiest)**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait 10 seconds
sleep 10

# Run migrations
npm run prisma:migrate
```

**Option B: Local PostgreSQL**
```bash
# Create database in PostgreSQL
createdb first_ring_ai

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### 4. Create first admin user

```bash
# Option 1: Prisma Studio UI
npm run prisma:studio
# Browser will open, go to AdminUser table and create user

# Option 2: With SQL
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

**To create password hash:**
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

### 5. Start server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

Server will run at **http://localhost:5000**

---

## 🧪 Testing

### Health check
```bash
curl http://localhost:5000/health
```

**Expected response:**
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

### Create lead (test)
```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "source": "landing_page_form",
    "contactName": "Test User",
    "email": "test@example.com",
    "phone": "+15551234567",
    "businessName": "Test Restaurant",
    "businessType": "restaurant",
    "selectedPlan": "pro",
    "callVolume": 30
  }'
```

---

## 📁 Important files

```
first-ring-ai-backend/
├── .env                    # Environment variables (YOU MUST CREATE!)
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

## 🐛 Troubleshooting

### Port already in use
```bash
# Change port in .env file
PORT=5001
```

### Database connection error
```bash
# Check if PostgreSQL is running
pg_isready

# Is DATABASE_URL correct?
echo $DATABASE_URL
```

### Prisma client error
```bash
# Regenerate client
npm run prisma:generate
```

### Cannot find module errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

---

## 📊 What happens when first Lead is created?

1. ✅ Lead is saved to database
2. 📧 Email is sent to admin (SALES_EMAIL)
3. 📱 Confirmation email is sent to lead
4. 🎯 Qualification score is calculated
5. 🔥 Priority is assigned (hot/high/normal/low)

**Gmail setup for admin email notifications:**

1. Enable 2-Factor Authentication in Gmail
2. Create App Password: https://myaccount.google.com/apppasswords
3. In .env file:
```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
```

---

## 🚀 Deploy to Production

### AWS EC2 (recommended)

```bash
# 1. SSH to EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 4. Clone and setup
git clone <your-repo>
cd first-ring-ai-backend
npm install
npm run build

# 5. Run with PM2
npm install -g pm2
pm2 start dist/server.js --name first-ring-ai
pm2 save
pm2 startup
```

### With Docker (easier)

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

## 📞 Contact & Support

**Having issues?**
- Read README.md
- Check logs: `logs/error.log`
- Docker logs: `docker-compose logs backend`

**Feature request?**
- Open an issue on GitHub
- Email: dev@firstringai.com

---

## ✅ Next Steps

After the backend is running:

1. ✅ Set up Frontend (Next.js)
2. ✅ Create and integrate Twilio account
3. ✅ Retell AI setup
4. ✅ Configure Stripe account
5. ✅ Enable Google APIs
6. ✅ Test in production
7. ✅ Onboard your first customer! 🎉

---

**Good luck! 🚀**

First Ring AI Development Team
