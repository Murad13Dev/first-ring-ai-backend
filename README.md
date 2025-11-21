# 🤖 First Ring AI - Multi-Language Phone Agent

> AI-powered phone agent that speaks 10 languages and handles bookings, orders, and customer inquiries automatically.

## 🌟 Features

- 🌍 **10 Languages** - Auto-detects and responds in caller's language
- 🤖 **AI Agent** - Twilio + GPT-4 for natural conversations
- 📅 **Booking System** - Smart scheduling with Google Calendar sync
- 🛒 **Order Management** - Full e-commerce with Stripe payments
- 📊 **Analytics** - Detailed insights and call logs
- 🔗 **Integrations** - Google Sheets, Calendar, Email, SMS

## 🚀 Quick Start

```bash
# Extract & Install
tar -xzf first-ring-ai-backend.tar.gz
cd first-ring-ai-backend
npm install

# Configure
cp .env.example .env
# Add your API keys

# Start
docker-compose up -d postgres redis
npm run prisma:migrate
npm run dev
```

Server: `http://localhost:5000`

## 🌍 Supported Languages

| Code | Language | Native |
|------|----------|--------|
| az | Azerbaijani | Azərbaycan |
| en | English | English |
| ru | Russian | Русский |
| es | Spanish | Español |
| it | Italian | Italiano |
| fr | French | Français |
| zh | Chinese | 中文 |
| ja | Japanese | 日本語 |
| fa | Persian | فارسی |
| tl | Tagalog | Tagalog |

## 📚 Documentation

- [Quick Start](./QUICKSTART.md)
- [AI Agent Setup](./AI_AGENT_SETUP.md)
- [Google APIs Setup](./GOOGLE_APIS_SETUP.md)
- [Multilingual Guide](./MULTILINGUAL_GUIDE.md)

## 🧪 Test AI

```bash
curl -X POST http://localhost:5000/api/ai-agent/test \
  -H "Authorization: Bearer TOKEN" \
  -d '{"userInput": "I want to book a table", "language": "en"}'
```

## 📦 What's Included

- ✅ 10 Complete Modules
- ✅ 86+ API Endpoints
- ✅ 12,000+ Lines of Code
- ✅ Multi-Language Support
- ✅ Payment Processing
- ✅ Google Integrations
- ✅ Complete Documentation

## 🏗️ Tech Stack

- **Backend:** Node.js, TypeScript, Express
- **Database:** PostgreSQL, Prisma ORM
- **Cache:** Redis
- **AI:** OpenAI GPT-4
- **Voice:** Twilio
- **Payments:** Stripe
- **Cloud:** Google APIs

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

**Made with ❤️ by First Ring AI Team**
