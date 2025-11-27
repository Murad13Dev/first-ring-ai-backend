# Deployment Guide

This guide explains how to deploy the First Ring AI Backend to production.

## 🚀 Quick Deployment

### Method 1: Simple Deployment (VPS/EC2)

1. **Clone the repository**
```bash
git clone https://github.com/murad13dev/first-ring-ai-backend.git
cd first-ring-ai-backend
```

2. **Set up environment variables**
```bash
cp .env.example .env
nano .env  # Edit with your production values
```

3. **Install dependencies & build**
```bash
npm run deploy:build
```
This command automatically:
- Installs all dependencies
- Generates Prisma client
- Builds TypeScript to JavaScript

4. **Run database migrations**
```bash
npm run deploy:migrate
```

5. **Start the application**
```bash
npm run deploy:start
```
This command:
- Runs pending migrations
- Starts the server

### Method 2: Using PM2 (Recommended for Production)

1. **Install PM2 globally**
```bash
npm install -g pm2
```

2. **Follow steps 1-4 from Method 1**

3. **Start with PM2**
```bash
pm2 start dist/server.js --name "first-ring-ai"
pm2 save
pm2 startup
```

4. **Useful PM2 commands**
```bash
pm2 status              # Check status
pm2 logs first-ring-ai  # View logs
pm2 restart first-ring-ai  # Restart app
pm2 stop first-ring-ai  # Stop app
```

### Method 3: Docker Deployment

1. **Build Docker image**
```bash
docker build -t first-ring-ai-backend .
```

2. **Run with Docker Compose**
```bash
docker-compose up -d
```

## 📋 Environment Variables

Copy `.env.example` to `.env` and configure these critical variables:

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens

### Optional but Recommended
- `SMTP_USER` & `SMTP_PASSWORD` - For email functionality
- `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN` - For phone calls
- `OPENAI_API_KEY` - For AI features
- `REDIS_URL` - For caching (improves performance)

## 🔧 Platform-Specific Deployment

### Railway

1. **Connect your GitHub repository to Railway**

2. **Add environment variables** in Railway dashboard

3. **Railway automatically runs:**
```
npm install  # Triggers postinstall (prisma generate)
npm run build
npm start
```

4. **Add this to Railway settings:**
   - Build Command: `npm run deploy:build`
   - Start Command: `npm run deploy:start`

### Heroku

1. **Create Heroku app**
```bash
heroku create your-app-name
```

2. **Add PostgreSQL addon**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

3. **Set environment variables**
```bash
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production
# ... add other env vars
```

4. **Deploy**
```bash
git push heroku main
```

5. **Run migrations**
```bash
heroku run npm run deploy:migrate
```

### Render

1. **Connect your GitHub repository**

2. **Configure service:**
   - Build Command: `npm run deploy:build`
   - Start Command: `npm run deploy:start`

3. **Add environment variables** in Render dashboard

4. **Render automatically deploys on push**

### DigitalOcean App Platform

1. **Connect your GitHub repository**

2. **Configure build settings:**
   - Build Command: `npm run deploy:build`
   - Run Command: `npm run deploy:start`

3. **Add environment variables**

4. **Deploy automatically on push**

### AWS EC2 / VPS

1. **SSH into your server**

2. **Install Node.js 18+ and PostgreSQL**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql
```

3. **Clone and setup**
```bash
git clone https://github.com/murad13dev/first-ring-ai-backend.git
cd first-ring-ai-backend
cp .env.example .env
nano .env  # Configure your environment
```

4. **Install and build**
```bash
npm run deploy:build
```

5. **Setup PostgreSQL database**
```bash
sudo -u postgres psql
CREATE DATABASE first_ring_ai;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE first_ring_ai TO your_user;
\q
```

6. **Update DATABASE_URL in .env** with your credentials

7. **Run migrations**
```bash
npm run deploy:migrate
```

8. **Start with PM2**
```bash
npm install -g pm2
pm2 start dist/server.js --name "first-ring-ai"
pm2 startup
pm2 save
```

9. **Setup Nginx as reverse proxy** (optional but recommended)
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/first-ring-ai
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/first-ring-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Generate Prisma Client
      run: npx prisma generate

    - name: Build
      run: npm run build

    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /path/to/first-ring-ai-backend
          git pull
          npm run deploy:build
          npm run deploy:migrate
          pm2 restart first-ring-ai
```

## 📊 Database Migrations

### Running Migrations

```bash
# Development
npm run prisma:migrate

# Production
npm run deploy:migrate
```

### Creating New Migrations

```bash
npx prisma migrate dev --name your_migration_name
```

### Reset Database (⚠️ DANGER - Deletes all data)

```bash
npx prisma migrate reset
```

## 🛠️ Troubleshooting

### Prisma Client Issues

If you see "Prisma Client not found" errors:
```bash
npx prisma generate
```

### Migration Errors

If migrations fail:
```bash
npx prisma migrate resolve --rolled-back "migration_name"
npx prisma migrate deploy
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 <PID>
```

### TypeScript Build Errors

```bash
# Clean and rebuild
rm -rf dist
npm run build
```

## 📝 Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Database migrations are applied
- [ ] SSL certificate is configured (use Let's Encrypt)
- [ ] Firewall is configured properly
- [ ] Monitoring is set up (PM2, DataDog, etc.)
- [ ] Backup strategy is in place
- [ ] Logs are being collected
- [ ] API endpoints are accessible
- [ ] Email sending works
- [ ] External integrations work (Twilio, OpenAI, etc.)

## 🔐 Security Recommendations

1. **Use strong secrets** for JWT_SECRET and JWT_REFRESH_SECRET
2. **Enable HTTPS** with SSL certificates
3. **Set up firewall** (only allow ports 80, 443, and SSH)
4. **Use environment variables** for all sensitive data
5. **Enable rate limiting** in production
6. **Regular security updates** - `npm audit fix`
7. **Database backups** - Set up automated backups
8. **Monitor logs** for suspicious activity

## 📞 Support

If you encounter issues during deployment:
- Check logs: `pm2 logs` or `docker logs`
- Review environment variables
- Verify database connection
- Check firewall rules
- Contact support: support@firstringai.com

## 🎯 Performance Tips

1. **Use Redis** for caching
2. **Enable gzip compression** in Nginx
3. **Use CDN** for static assets
4. **Database connection pooling** (already configured in Prisma)
5. **Monitor with PM2** or similar tools
6. **Set NODE_ENV=production**
7. **Use clustering** for multi-core servers

---

**Happy Deploying! 🚀**
