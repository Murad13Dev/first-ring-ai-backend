# Tenant Creation with Email Verification Flow

## Overview

This document describes the new simplified tenant creation flow with email verification. This flow provides a professional onboarding experience where tenant owners receive an email to set their password instead of requiring it during creation.

---

## 📚 API Endpoints Summary

This document covers the following endpoints:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/tenants` | Admin | Create new tenant (simplified, triggers email) |
| `POST` | `/api/auth/set-password` | None | Set password from email verification token |
| `DELETE` | `/api/leads/:id` | Admin | Delete a lead (cannot delete converted leads) |

**New Features:**
- ✅ Simplified tenant creation (only 3 required fields)
- ✅ Email verification with password setup flow
- ✅ Lead delete operation with safety checks
- ✅ Auto-approval for tenant owners
- ✅ Professional welcome email template

**Migration Required:** See [Database Migration](#-database-migration-critical) section below.

---

## 🎯 Benefits

### For Admins:
- ✅ **Simplified Creation**: Only 3 required fields (name, email, businessType)
- ✅ **No Password Management**: Users set their own secure passwords
- ✅ **Automated Process**: Email sent automatically
- ✅ **Professional Experience**: Beautiful welcome email

### For Users:
- ✅ **Secure**: Users create their own passwords
- ✅ **Auto-Verification**: Email verified automatically after password setup
- ✅ **Instant Access**: No admin approval needed for tenant owners
- ✅ **14-Day Trial**: Starts immediately after activation

---

## 📋 Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ Step 1: Admin Creates Tenant (Simple)                           │
│ POST /api/tenants                                                │
│ { name, email, businessType }                                   │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 2: Backend Auto-Processing                                 │
│ • Creates Tenant record                                         │
│ • Creates Owner user (emailVerified: false)                     │
│ • Generates verification token (24h expiry)                     │
│ • Sends welcome email with verification link                    │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 3: User Receives Email                                     │
│ Subject: "Welcome to First Ring AI - [Tenant Name]"             │
│ • Beautiful HTML template                                       │
│ • Clear CTA: "Set Your Password"                               │
│ • Link: /auth/set-password?token=...                           │
│ • Valid for 24 hours                                            │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 4: User Sets Password                                      │
│ POST /api/auth/set-password                                     │
│ { token, password }                                              │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 5: Backend Auto-Activation                                 │
│ • Sets password hash                                            │
│ • Verifies email (emailVerified: true)                         │
│ • Auto-approves user (adminApproved: true)                     │
│ • Clears verification token                                     │
│ • Returns user data + success message                           │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 6: User Redirected to Dashboard                            │
│ • Can login immediately                                          │
│ • 14-day trial active                                           │
│ • Full access to all features                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### 1. Create Tenant (Admin)

**Endpoint:** `POST /api/tenants`

**Authentication:** Admin Bearer Token required

**Request Body:**

```json
{
  "name": "Max Restaurant",
  "email": "restaurant@max.com",
  "businessType": "restaurant",
  "phone": "234234",           // optional
  "address": "123 Main St",    // optional
  "city": "New York",          // optional
  "website": "https://max.com", // optional
  "plan": "starter"            // optional, default: "free"
}
```

**Required Fields:**
- `name` (string): Tenant/business name
- `email` (string): Tenant email (will also be used for owner if not specified)
- `businessType` (string): One of: "restaurant", "hotel", "fitness", "clinic", "salon", "other"

**Optional Fields:**
- `phone` (string): Business phone
- `address` (string): Business address
- `city` (string): Business city
- `website` (string): Business website
- `plan` (string): Subscription plan ("free", "basic", "pro", "enterprise")
- `ownerName` (string): Custom owner name (defaults to tenant name)
- `ownerEmail` (string): Custom owner email (defaults to tenant email)
- `ownerPassword` (string): If provided, skips email verification flow

**Response (Success - 201):**

```json
{
  "success": true,
  "message": "Tenant created successfully. Verification email sent to owner.",
  "data": {
    "tenant": {
      "id": "uuid-here",
      "name": "Max Restaurant",
      "email": "restaurant@max.com",
      "businessType": "restaurant",
      "plan": "starter",
      "subscriptionStatus": "trial",
      "trialEndsAt": "2025-01-01T12:00:00.000Z",
      "createdAt": "2024-12-18T12:00:00.000Z"
    },
    "owner": {
      "id": "uuid-here",
      "email": "restaurant@max.com",
      "name": "Max Restaurant",
      "role": "owner",
      "emailVerified": false
    },
    "needsVerification": true
  }
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "message": "Required fields: name, businessType, email"
}
```

```json
{
  "success": false,
  "message": "Email already registered"
}
```

---

### 2. Set Password from Verification Token

**Endpoint:** `POST /api/auth/set-password`

**Authentication:** None (uses token from email)

**Request Body:**

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0...",  // From email link
  "password": "MySecurePass123!"         // Min 8 characters
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Password set successfully. Your account has been activated!",
  "data": {
    "id": "uuid-here",
    "email": "restaurant@max.com",
    "name": "Max Restaurant",
    "role": "owner",
    "emailVerified": true,
    "adminApproved": true,
    "tenantId": "uuid-here",
    "tenant": {
      "id": "uuid-here",
      "name": "Max Restaurant",
      "businessType": "restaurant",
      "plan": "starter"
    }
  }
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "message": "Token and password are required"
}
```

```json
{
  "success": false,
  "message": "Password must be at least 8 characters long"
}
```

```json
{
  "success": false,
  "message": "Invalid or expired verification token"
}
```

---

## 🎨 Frontend Integration Guide

### Step 1: Create Tenant Form (Admin Panel)

```jsx
// AdminTenantCreateForm.jsx

import { useState } from 'react';
import { adminApi } from '@/api/admin';

export default function TenantCreateForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessType: 'restaurant',
    phone: '',
    plan: 'starter'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await adminApi.post('/tenants', formData);

      if (response.data.success) {
        setResult({
          type: 'success',
          message: response.data.message,
          data: response.data.data
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create tenant'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Business Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />

      <input
        type="email"
        placeholder="Business Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />

      <select
        value={formData.businessType}
        onChange={(e) => setFormData({...formData, businessType: e.target.value})}
        required
      >
        <option value="restaurant">Restaurant</option>
        <option value="hotel">Hotel</option>
        <option value="fitness">Fitness</option>
        <option value="clinic">Clinic</option>
        <option value="salon">Salon</option>
        <option value="other">Other</option>
      </select>

      <input
        type="tel"
        placeholder="Phone (optional)"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
      />

      <select
        value={formData.plan}
        onChange={(e) => setFormData({...formData, plan: e.target.value})}
      >
        <option value="starter">Starter</option>
        <option value="professional">Professional</option>
        <option value="enterprise">Enterprise</option>
      </select>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Tenant'}
      </button>

      {result && (
        <div className={result.type === 'success' ? 'alert-success' : 'alert-error'}>
          {result.message}

          {result.type === 'success' && result.data.needsVerification && (
            <p>✅ Verification email sent to {result.data.owner.email}</p>
          )}
        </div>
      )}
    </form>
  );
}
```

---

### Step 2: Set Password Page (Public)

```jsx
// SetPasswordPage.jsx

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.post('/auth/set-password', {
        token,
        password
      });

      if (response.data.success) {
        setSuccess(true);

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', {
            state: {
              email: response.data.data.email,
              message: 'Account activated! Please log in.'
            }
          });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="error">Invalid verification link</div>;
  }

  if (success) {
    return (
      <div className="success-message">
        <h2>✅ Account Activated!</h2>
        <p>Your password has been set successfully.</p>
        <p>Redirecting to login page...</p>
      </div>
    );
  }

  return (
    <div className="set-password-container">
      <div className="logo">
        <img src="/logo.png" alt="First Ring AI" />
      </div>

      <h1>Set Your Password</h1>
      <p>Welcome! Please create a secure password for your account.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (min 8 characters)"
            required
            minLength={8}
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
          />
        </div>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Setting Password...' : 'Activate Account'}
        </button>
      </form>

      <div className="password-requirements">
        <p>Password Requirements:</p>
        <ul>
          <li>At least 8 characters long</li>
          <li>Mix of letters and numbers recommended</li>
          <li>Use special characters for extra security</li>
        </ul>
      </div>
    </div>
  );
}
```

---

### Step 3: API Service Configuration

```javascript
// api/admin.js
import axios from 'axios';

const adminApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token interceptor
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { adminApi };
```

```javascript
// api/auth.js
import axios from 'axios';

const authApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export { authApi };
```

---

## 📧 Email Template

The system automatically sends a professional welcome email with the following structure:

**Subject:** `Welcome to First Ring AI - [Tenant Name]`

**Content Highlights:**
- 🎉 Welcome header with success icon
- Clear explanation of next steps
- **Big CTA button**: "Set Your Password"
- Link validity warning (24 hours)
- Step-by-step guide
- Feature highlights
- Support contact information
- Professional footer

**Link Format:**
```
https://app.firstringai.com/auth/set-password?token=VERIFICATION_TOKEN
```

---

## ⚙️ Configuration

### Environment Variables

Make sure these are set in your `.env` file:

```bash
# Frontend URL (for email links)
FRONTEND_URL=https://app.firstringai.com

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@firstringai.com
SUPPORT_EMAIL=support@firstringai.com

# JWT Secret
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

---

## 🔒 Security Features

1. **Token Expiration**: Verification tokens expire after 24 hours
2. **One-Time Use**: Tokens are cleared after successful password setup
3. **Password Validation**: Minimum 8 characters enforced
4. **Auto-Approval**: Tenant owners are auto-approved (no manual admin approval)
5. **Email Verification**: Automatically verified when password is set

---

## 🧪 Testing

### Manual Testing Flow:

```bash
# 1. Create tenant via admin API
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Restaurant",
    "email": "test@example.com",
    "businessType": "restaurant",
    "plan": "starter"
  }'

# 2. Check email logs or database for verification token
# users.verificationToken column

# 3. Set password with token
curl -X POST http://localhost:3000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL",
    "password": "Test12345!"
  }'

# 4. Login with new credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test12345!"
  }'
```

---

## 🔧 Additional Admin APIs

### 3. Delete Lead (Admin)

This endpoint was added to complete CRUD operations for lead management.

**Endpoint:** `DELETE /api/leads/:id`

**Authentication:** Admin Bearer Token required

**URL Parameters:**
- `id` (string, required): Lead UUID

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "message": "Cannot delete a converted lead"
}
```

**Response (Error - 404):**

```json
{
  "success": false,
  "message": "Lead not found"
}
```

**Usage Example:**

```javascript
// Delete lead
const deleteLead = async (leadId) => {
  try {
    const response = await adminApi.delete(`/leads/${leadId}`);

    if (response.data.success) {
      alert('Lead deleted successfully');
      // Refresh leads list
    }
  } catch (error) {
    if (error.response?.status === 400) {
      alert('Cannot delete converted leads');
    } else {
      alert('Failed to delete lead');
    }
  }
};
```

**Important Notes:**
- ✅ Can delete leads with status: `new`, `contacted`, `qualified`, `in_progress`, `lost`
- ❌ Cannot delete leads with status: `converted` (already became tenant)
- 🔒 Admin authentication required
- 📝 Deletion is logged for audit trail

---

## 📝 Notes

### Backward Compatibility:

The system maintains backward compatibility. If you provide `ownerPassword` during tenant creation, the email verification flow is skipped and the user is created directly:

```json
POST /api/tenants
{
  "name": "Old Style Tenant",
  "email": "old@example.com",
  "businessType": "restaurant",
  "ownerPassword": "DirectPassword123!" // ← Skips email flow
}
```

---

## 🗄️ Database Migration (CRITICAL)

### ⚠️ IMPORTANT: Run Migration Before Using

Before using the email verification feature, you **MUST** run the database migration to add required columns to the `users` table.

### Migration Details:

**File:** `prisma/migrations/20251218145200_add_email_verification_to_users/migration.sql`

**Adds Three Columns:**
1. `emailVerified` (boolean, default: false) - Tracks email verification status
2. `verificationToken` (text, nullable) - Stores verification token
3. `verificationTokenExpires` (timestamp, nullable) - Token expiration time

### How to Run Migration:

#### Option 1: Using Prisma CLI (Recommended)

```bash
# Install dependencies if needed
npm install

# Run migration
npm run prisma:migrate:prod
```

#### Option 2: Direct SQL Execution

```bash
# Using psql
psql "$DATABASE_URL" -f prisma/migrations/20251218145200_add_email_verification_to_users/migration.sql
```

#### Option 3: SQL Query (Manual)

```sql
-- Connect to your database and run:
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verificationToken" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationTokenExpires" TIMESTAMP(3);
```

### Verify Migration:

After running the migration, verify it was successful:

```bash
# Check table structure
psql "$DATABASE_URL" -c "\d users"

# You should see the new columns:
# - emailVerified (boolean)
# - verificationToken (text)
# - verificationTokenExpires (timestamp)
```

Or using Prisma Studio:

```bash
npm run prisma:studio
# Open browser and check users table schema
```

### Migration Rollback (if needed):

If you need to rollback:

```sql
ALTER TABLE users
  DROP COLUMN IF EXISTS "emailVerified",
  DROP COLUMN IF EXISTS "verificationToken",
  DROP COLUMN IF EXISTS "verificationTokenExpires";
```

**⚠️ Warning:** This will delete all verification data. Make sure to backup first!

---

## 🆘 Troubleshooting

### Token Expired Error:
- Tokens expire after 24 hours
- Admin needs to recreate the tenant
- Or implement a "resend verification email" feature

### Email Not Received:
- Check SMTP configuration in `.env`
- Check email service logs
- Verify email address is correct
- Check spam folder

### Password Requirements Not Met:
- Frontend should validate before submission
- Backend enforces minimum 8 characters
- Show clear error messages to user

---

## 🚀 Future Enhancements

Potential improvements:
1. Resend verification email endpoint
2. Custom email templates per business type
3. Multi-language email support
4. Password strength indicator on frontend
5. Social login integration (Google, Microsoft)
6. Two-factor authentication option

---

## 📞 Support

For questions or issues:
- Email: support@firstringai.com
- GitHub: Create an issue
- Documentation: Check API-ENDPOINTS-AZ.md for Azerbaijani version
