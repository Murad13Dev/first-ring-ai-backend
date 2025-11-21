# 📊 Google APIs Integration Guide

## Google Sheets + Google Calendar Setup

### 📋 Prerequisites

1. **Google Cloud Project**
2. **OAuth 2.0 Credentials**
3. **API Keys**

---

## 🔧 Setup Steps

### **Step 1: Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project"
3. Name: "First Ring AI"
4. Click "Create"

### **Step 2: Enable APIs**

1. Go to "APIs & Services" → "Library"
2. Search and enable:
   - **Google Sheets API**
   - **Google Calendar API**
   - **Google Drive API**

### **Step 3: Create OAuth 2.0 Credentials**

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: "First Ring AI Backend"
5. Authorized redirect URIs:
   ```
   http://localhost:5000/api/integrations/sheets/callback
   http://localhost:5000/api/integrations/calendar/callback
   https://your-domain.com/api/integrations/sheets/callback
   https://your-domain.com/api/integrations/calendar/callback
   ```
6. Click "Create"
7. Download JSON credentials

### **Step 4: Configure Environment**

Add to `.env`:

```env
# Google APIs
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/sheets/callback

# Or for production:
# GOOGLE_REDIRECT_URI=https://your-domain.com/api/integrations/sheets/callback
```

---

## 🚀 Usage

### **1. Connect Google Sheets**

#### **Get Authorization URL:**
```bash
curl http://localhost:5000/api/integrations/sheets/auth \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

#### **User Flow:**
1. Open the URL in browser
2. Login with Google
3. Grant permissions
4. User will be redirected back with code
5. Backend automatically saves tokens

### **2. Create Spreadsheet**

```bash
curl -X POST http://localhost:5000/api/integrations/sheets/spreadsheet \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Restaurant Data"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "spreadsheetId": "1BxiM...",
    "url": "https://docs.google.com/spreadsheets/d/1BxiM..."
  }
}
```

### **3. Export Data to Sheets**

#### **Export Bookings:**
```bash
curl http://localhost:5000/api/integrations/sheets/export/bookings \
  -H "Authorization: Bearer YOUR_TOKEN"

# With date range:
curl "http://localhost:5000/api/integrations/sheets/export/bookings?dateFrom=2024-01-01&dateTo=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Export Orders:**
```bash
curl http://localhost:5000/api/integrations/sheets/export/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Export Calls:**
```bash
curl http://localhost:5000/api/integrations/sheets/export/calls \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sheetName": "Bookings_2024-11-20",
    "recordCount": 150,
    "url": "https://docs.google.com/spreadsheets/d/1BxiM..."
  }
}
```

---

### **4. Connect Google Calendar**

#### **Get Authorization URL:**
```bash
curl http://localhost:5000/api/integrations/calendar/auth \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **List Calendars:**
```bash
curl http://localhost:5000/api/integrations/calendar/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "primary",
      "summary": "My Calendar",
      "timeZone": "Asia/Baku"
    },
    {
      "id": "restaurant@group.calendar.google.com",
      "summary": "Restaurant Bookings"
    }
  ]
}
```

### **5. Create Calendar Event from Booking**

```bash
curl -X POST http://localhost:5000/api/integrations/calendar/event \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking_id_here"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "abc123...",
    "eventUrl": "https://calendar.google.com/calendar/event?eid=..."
  }
}
```

### **6. Sync All Bookings to Calendar**

```bash
curl -X POST http://localhost:5000/api/integrations/calendar/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bookingId": "abc123",
      "success": true,
      "eventId": "xyz789",
      "eventUrl": "https://..."
    },
    ...
  ]
}
```

### **7. Get Upcoming Events**

```bash
curl "http://localhost:5000/api/integrations/calendar/upcoming?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔄 Auto-Sync

### **Setup Cron Job:**

Add to your cron or task scheduler:

```bash
# Daily at 1 AM - Export yesterday's data to Sheets
0 1 * * * curl -X POST http://localhost:5000/api/integrations/sheets/auto-sync \
  -H "Authorization: Bearer SYSTEM_TOKEN"

# Every hour - Sync new bookings to Calendar
0 * * * * curl -X POST http://localhost:5000/api/integrations/calendar/sync \
  -H "Authorization: Bearer SYSTEM_TOKEN"
```

---

## 📊 Example: Full Integration Flow

### **Restaurant Use Case:**

```bash
# 1. Connect Google Sheets
curl http://localhost:5000/api/integrations/sheets/auth -H "Authorization: Bearer TOKEN"
# User opens URL, grants access

# 2. Create spreadsheet
curl -X POST http://localhost:5000/api/integrations/sheets/spreadsheet \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title": "Pizza House Data"}'

# 3. Connect Google Calendar
curl http://localhost:5000/api/integrations/calendar/auth -H "Authorization: Bearer TOKEN"
# User opens URL, grants access

# 4. Customer calls and books table
# AI Agent creates booking automatically

# 5. Booking auto-syncs to Calendar
# Event created: "Booking: John Doe - 4 people - 19:00"

# 6. End of day - Export to Sheets
curl http://localhost:5000/api/integrations/sheets/export/bookings -H "Authorization: Bearer TOKEN"

# Result: 
# - Calendar has all bookings with reminders
# - Sheets has daily export of all data
# - Team can see everything in Google Workspace
```

---

## 🔐 Security

### **Token Storage:**
- Tokens stored encrypted in database
- Refresh token used to get new access tokens
- No manual token management needed

### **Permissions:**
- **Sheets:** Read/write to user's spreadsheets
- **Calendar:** Read/write to user's calendars
- **Drive:** Create files (for Sheets)

### **Revoke Access:**
```bash
# Disconnect Sheets
curl -X DELETE http://localhost:5000/api/integrations/sheets/disconnect \
  -H "Authorization: Bearer TOKEN"

# Disconnect Calendar
curl -X DELETE http://localhost:5000/api/integrations/calendar/disconnect \
  -H "Authorization: Bearer TOKEN"
```

---

## 📈 Data Export Format

### **Bookings Sheet:**
```
| ID      | Customer | Phone        | Service  | Date       | Time  | Status    |
|---------|----------|--------------|----------|------------|-------|-----------|
| abc123  | John Doe | +15551234567 | Table    | 2024-11-20 | 19:00 | confirmed |
```

### **Orders Sheet:**
```
| ID      | Customer | Phone        | Items | Total  | Payment | Status    |
|---------|----------|--------------|-------|--------|---------|-----------|
| ord456  | Jane Doe | +15557890123 | 3     | 45.99  | paid    | completed |
```

### **Calls Sheet:**
```
| From         | To           | Direction | Duration | Intent  | Outcome   |
|--------------|--------------|-----------|----------|---------|-----------|
| +15551234567 | +15559876543 | inbound   | 180      | booking | completed |
```

---

## 🐛 Troubleshooting

### **Error: "Google Sheets not connected"**
- User needs to authorize first
- Check tokens in database
- Re-authorize if needed

### **Error: "Invalid credentials"**
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Verify redirect URI matches

### **Calendar events not creating:**
- Check calendar permissions
- Verify timezone settings
- Check googleCalendarId in tenant

### **Sheets export failing:**
- Check if spreadsheet exists
- Verify write permissions
- Check API quota

---

## 💰 Google API Costs

### **Free Tier:**
- **Sheets API:** 60 requests/min (free)
- **Calendar API:** 1,000,000 requests/day (free)
- **Drive API:** 20,000 requests/day (free)

**For most businesses: FREE!** 🎉

---

## 📚 Resources

- [Google Sheets API Docs](https://developers.google.com/sheets/api)
- [Google Calendar API Docs](https://developers.google.com/calendar/api)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)

---

Made with ❤️ by First Ring AI Team
