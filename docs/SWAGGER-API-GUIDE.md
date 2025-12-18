# Swagger API Documentation Guide

## 🎯 Overview

First Ring AI API uses **Swagger UI** (OpenAPI 3.0) for interactive API documentation. This allows you to explore, test, and understand all API endpoints without writing code.

---

## 🌐 Accessing Swagger UI

### Development Environment:
```
http://localhost:5000/api-docs
```

### Production Environment:
```
https://api.firstringai.com/api-docs
```

---

## 📚 What's Included

Swagger UI provides interactive documentation for all API endpoints:

### Available API Categories:

| Category | Description | Example Endpoints |
|----------|-------------|-------------------|
| 🔐 **Auth** | Authentication & authorization | Login, Register, Verify Email, Set Password |
| 📝 **Leads** | Lead generation & management | Create, List, Update, Delete, Convert to Tenant |
| 🏢 **Tenants** | Tenant management (admin) | Create Tenant, List Tenants, Update, Delete |
| 🛎️ **Services** | Services/Menu management | CRUD operations for services/menu items |
| ❓ **FAQs** | FAQ management | Create, Read, Update, Delete FAQs |
| 📅 **Bookings** | Booking/Reservation system | Create, List, Update booking status |
| 🛒 **Orders** | Order management | Create orders, track status, payments |
| 📞 **Calls** | Call logs & analytics | View call history, transcripts, AI analysis |
| 🤖 **AI Agent** | AI phone agent endpoints | Webhook handlers, agent configuration |
| 🔌 **Integrations** | Third-party integrations | Twilio, Square, Google Calendar, Retell AI |
| 📊 **Analytics** | Analytics & reporting | Dashboard stats, revenue, performance metrics |

---

## 🚀 How to Use Swagger UI

### Step 1: Open Swagger UI

Navigate to the Swagger URL in your browser:
```
http://localhost:5000/api-docs
```

### Step 2: Browse Endpoints

- Click on any **category** to expand and see available endpoints
- Each endpoint shows:
  - ✅ HTTP Method (GET, POST, PUT, DELETE)
  - ✅ Full URL path
  - ✅ Description
  - ✅ Request parameters & body schema
  - ✅ Response examples (success & error)
  - ✅ Authentication requirements

### Step 3: Authenticate (For Protected Endpoints)

Many endpoints require authentication. Here's how to set it up:

1. **Get an Access Token:**
   - For **Admin**: Use `POST /api/auth/admin/login`
   - For **User**: Use `POST /api/auth/login`

2. **Click "Authorize" button** (top right of Swagger UI)

3. **Enter your token:**
   ```
   Bearer YOUR_ACCESS_TOKEN_HERE
   ```

4. **Click "Authorize"**

Now all authenticated requests will include your token automatically!

### Step 4: Try an Endpoint

1. Click on any endpoint to expand it
2. Click **"Try it out"** button
3. Fill in required parameters/body
4. Click **"Execute"**
5. View the response below

---

## 📝 Examples

### Example 1: Create a New Tenant (Admin)

**Endpoint:** `POST /api/tenants`

**Steps:**
1. Expand **Tenants** section
2. Find `POST /api/tenants`
3. Click **"Try it out"**
4. Fill in the request body:
   ```json
   {
     "name": "Test Restaurant",
     "email": "test@restaurant.com",
     "businessType": "restaurant",
     "plan": "starter"
   }
   ```
5. Click **"Execute"**
6. See the response:
   ```json
   {
     "success": true,
     "message": "Tenant created successfully. Verification email sent to owner.",
     "data": {
       "tenant": {...},
       "owner": {...},
       "needsVerification": true
     }
   }
   ```

### Example 2: Set Password from Verification Token

**Endpoint:** `POST /api/auth/set-password`

**Steps:**
1. Expand **Auth** section
2. Find `POST /api/auth/set-password`
3. Click **"Try it out"**
4. No authentication needed for this endpoint
5. Fill in:
   ```json
   {
     "token": "a1b2c3d4e5f6...",
     "password": "MySecurePass123!"
   }
   ```
6. Click **"Execute"**
7. View activation confirmation

### Example 3: Delete a Lead

**Endpoint:** `DELETE /api/leads/{id}`

**Steps:**
1. Make sure you're authenticated (click "Authorize")
2. Expand **Leads** section
3. Find `DELETE /api/leads/{id}`
4. Click **"Try it out"**
5. Enter the Lead ID in the `id` parameter
6. Click **"Execute"**
7. Response:
   ```json
   {
     "success": true,
     "message": "Lead deleted successfully"
   }
   ```

---

## 🔐 Authentication in Swagger

### Bearer Token Format:

When you authenticate in Swagger, use this format:
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting Tokens:

#### Admin Token:
```bash
POST /api/auth/admin/login
{
  "email": "admin@firstringai.com",
  "password": "your-password"
}
```

Response includes `accessToken` - copy this!

#### User Token:
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "your-password"
}
```

### Using Token in Swagger:

1. Click **"Authorize"** button (🔓 icon at top)
2. Enter: `Bearer YOUR_TOKEN_HERE`
3. Click **"Authorize"**
4. Click **"Close"**

All subsequent requests will include this token automatically!

---

## 🎨 Understanding Swagger UI Components

### Color Codes:

- 🟢 **Green (GET)** - Read/retrieve data
- 🔵 **Blue (POST)** - Create new resources
- 🟡 **Yellow (PUT/PATCH)** - Update existing resources
- 🔴 **Red (DELETE)** - Delete resources

### Status Codes:

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation error)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **500** - Internal Server Error

### Schemas:

Click on **Schemas** at the bottom to see:
- Data models (User, Tenant, Lead, etc.)
- Field types and requirements
- Example values

---

## 🛠️ Advanced Features

### 1. Schema Explorer

View all data models:
- Scroll to bottom of Swagger UI
- Click on **"Schemas"**
- See complete data structures

Example schemas:
- `User` - User account structure
- `Tenant` - Tenant/business structure
- `Lead` - Lead data structure
- `Booking` - Booking structure
- `Order` - Order structure

### 2. Request/Response Examples

Each endpoint shows:
- Multiple response examples (success, errors)
- Request body examples
- Parameter descriptions

### 3. Download OpenAPI Spec

Get the raw OpenAPI JSON:
```
http://localhost:5000/api-docs/swagger.json
```

Use this to:
- Generate client libraries
- Import into Postman
- Create mock servers

---

## 📥 Importing to Other Tools

### Postman:

1. Open Postman
2. Click **Import**
3. Choose **Link**
4. Enter: `http://localhost:5000/api-docs/swagger.json`
5. Click **Import**

### Insomnia:

1. Open Insomnia
2. Click **Create** → **Import From**
3. Choose **URL**
4. Enter Swagger JSON URL
5. Import complete collection

### API Client Generation:

Generate client code in any language:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:5000/api-docs/swagger.json \
  -g typescript-axios \
  -o ./generated/api-client

# Generate Python client
openapi-generator-cli generate \
  -i http://localhost:5000/api-docs/swagger.json \
  -g python \
  -o ./generated/python-client
```

Supported languages: TypeScript, JavaScript, Python, Java, Go, PHP, Ruby, and 50+ more!

---

## 🆕 Recently Added Endpoints (December 2024)

### New Endpoints in Swagger:

1. **`POST /api/tenants`** - Simplified tenant creation
   - Now requires only: name, email, businessType
   - Triggers email verification flow
   - Auto-sends welcome email

2. **`POST /api/auth/set-password`** - Password setup from email token
   - No authentication required
   - Verifies email automatically
   - Auto-approves tenant owners

3. **`DELETE /api/leads/:id`** - Lead deletion with safety checks
   - Admin authentication required
   - Cannot delete converted leads
   - Includes audit logging

---

## 🔍 Search Functionality

Swagger UI includes search:

1. Press `Ctrl + F` (or `Cmd + F` on Mac)
2. Enter search term (e.g., "tenant", "booking", "email")
3. Navigate through results

Or use browser's built-in search to find specific endpoints, parameters, or descriptions.

---

## 📱 Mobile Access

Swagger UI is responsive and works on mobile devices:

1. Open on mobile browser
2. Tap to expand categories
3. Scroll to view parameters
4. Execute requests directly

However, for better experience, use desktop for testing and mobile for quick reference.

---

## 🐛 Troubleshooting

### Issue: "401 Unauthorized"
**Solution:**
- Click "Authorize" and enter your Bearer token
- Make sure token format is: `Bearer YOUR_TOKEN`
- Check if token is expired (default: 7 days)

### Issue: "CORS Error"
**Solution:**
- Backend already has CORS enabled
- Make sure you're accessing from allowed origin
- Check browser console for specific CORS errors

### Issue: "Schema validation failed"
**Solution:**
- Check required fields (marked with `*`)
- Verify data types (string, number, boolean)
- Match enum values exactly (case-sensitive)

### Issue: Can't see response
**Solution:**
- Scroll down after clicking "Execute"
- Check network tab in browser DevTools
- Verify backend is running on correct port

---

## 📊 Comparing with Written Documentation

| Feature | Swagger UI | Written Docs |
|---------|------------|--------------|
| Interactive Testing | ✅ Yes | ❌ No |
| Code Examples | ✅ Auto-generated | ✅ Manual |
| Always Up-to-Date | ✅ Yes | ⚠️ Needs updates |
| Search Functionality | ✅ Yes | ✅ Yes |
| Mobile Friendly | ⚠️ Limited | ✅ Yes |
| Frontend Examples | ❌ No | ✅ Yes |
| Flow Diagrams | ❌ No | ✅ Yes |

**Recommendation:** Use both together!
- **Swagger** for API reference and testing
- **Written docs** for integration guides and flows

---

## 🎓 Best Practices

### For Frontend Developers:

1. **Start with Swagger** - Understand API structure
2. **Test in Swagger** - Verify endpoints work
3. **Reference Written Docs** - See integration examples
4. **Generate Types** - Use OpenAPI spec for TypeScript types

### For Backend Developers:

1. **Keep Swagger annotations updated** in route files
2. **Test endpoints** in Swagger UI before deploying
3. **Document errors** - Add all possible error responses
4. **Use schemas** - Reference common schemas for consistency

---

## 📚 Additional Resources

### Related Documentation:
- [TENANT-CREATION-EMAIL-FLOW.md](./TENANT-CREATION-EMAIL-FLOW.md) - Tenant creation guide
- [API-ENDPOINTS-AZ.md](./API-ENDPOINTS-AZ.md) - Azerbaijani API docs
- [MIGRATION_INSTRUCTIONS.md](../MIGRATION_INSTRUCTIONS.md) - Database migration guide

### External Resources:
- [OpenAPI Specification](https://swagger.io/specification/) - OpenAPI 3.0 spec
- [Swagger UI Documentation](https://swagger.io/docs/open-source-tools/swagger-ui/) - Official Swagger docs
- [JWT.io](https://jwt.io/) - Decode and verify JWT tokens

---

## 🆘 Support

Having issues with Swagger UI?

- 📧 Email: support@firstringai.com
- 💬 GitHub Issues: Create an issue with label `documentation`
- 📖 Check: [Troubleshooting](#-troubleshooting) section above

---

## 🚀 Quick Start Checklist

- [ ] Open Swagger UI (`http://localhost:5000/api-docs`)
- [ ] Login to get access token (Admin or User)
- [ ] Click "Authorize" and enter token
- [ ] Try a simple GET endpoint (e.g., `GET /api/leads/stats`)
- [ ] Try creating a resource (e.g., `POST /api/tenants`)
- [ ] Check response status codes
- [ ] Export to Postman for team sharing
- [ ] Generate TypeScript types from OpenAPI spec

Happy API exploring! 🎉
