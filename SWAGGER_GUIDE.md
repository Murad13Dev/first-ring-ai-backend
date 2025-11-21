# 📚 First Ring AI - Swagger API Documentation Guide

## ✅ NƏ ƏLAVƏ EDİLDİ?

### 1. **Swagger UI** - Interactive API Documentation
- URL: `http://localhost:5000/api/docs`
- Real-time API testing
- All endpoints documented
- Request/Response schemas
- Try it out feature

### 2. **OpenAPI 3.0 Specification**
- JSON URL: `http://localhost:5000/api/docs.json`
- Can be imported to Postman
- Can be used with code generators

### 3. **Annotated Routes**
- ✅ Auth module (6 endpoints)
- ✅ Leads module (6 endpoints)
- Templates for other modules

---

## 🚀 NECƏ İSTİFADƏ ETMƏK

### **1. Server başlat:**
```bash
npm run dev
```

### **2. Browser-də aç:**
```
http://localhost:5000/api/docs
```

### **3. API-ləri test et:**

#### **Addım 1: Login**
1. `/api/auth/login` endpoint-ini aç
2. "Try it out" düyməsi
3. Request body-ni doldur:
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```
4. "Execute" düyməsi
5. Response-dan `accessToken` götür

#### **Addım 2: Authorize**
1. Yuxarıda "Authorize" düyməsi (kilid ikonası)
2. Token-i yapışdır: `Bearer your-token-here`
3. "Authorize" və "Close"

#### **Addım 3: Protected endpoints test et**
İndi `/api/auth/me` və ya `/api/leads` kimi protected endpoint-ləri test edə bilərsən!

---

## 📖 SWAGGER ANNOTATIONS NECƏ YAZMAQ

### **Sadə GET endpoint:**

```typescript
/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: Get all tenants
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tenant'
 */
router.get('/', tenantController.getAll);
```

### **POST endpoint with body:**

```typescript
/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Margarita Pizza
 *               price:
 *                 type: number
 *                 example: 12.99
 *     responses:
 *       201:
 *         description: Service created
 */
router.post('/', serviceController.create);
```

### **GET with parameters:**

```typescript
/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 */
router.get('/:id', bookingController.getById);
```

### **GET with query parameters:**

```typescript
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get orders with filters
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Orders list
 */
router.get('/', orderController.getAll);
```

---

## 🎨 YENİ SCHEMA ƏLAVƏ ETMƏK

`src/config/swagger.ts` faylında `components.schemas` bölməsinə əlavə et:

```typescript
MyNewModel: {
  type: 'object',
  required: ['field1', 'field2'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    field1: {
      type: 'string',
      example: 'value1',
    },
    field2: {
      type: 'number',
      example: 123,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
  },
},
```

Sonra route-larda istifadə et:

```typescript
schema:
  $ref: '#/components/schemas/MyNewModel'
```

---

## 🏷️ YENİ TAG ƏLAVƏ ETMƏK

`src/config/swagger.ts` faylında `tags` array-inə əlavə et:

```typescript
{
  name: 'MyModule',
  description: 'MyModule endpoints',
},
```

---

## 📦 POSTMAN-A İMPORT ETMƏK

### **Method 1: Direct import**
1. Postman-ı aç
2. Import → Link
3. URL daxil et: `http://localhost:5000/api/docs.json`
4. Import

### **Method 2: File import**
1. Browser-də aç: `http://localhost:5000/api/docs.json`
2. Save as `swagger.json`
3. Postman → Import → File
4. `swagger.json` seç

---

## ⚙️ SWAGGER CUSTOMIZATION

### **Logo əlavə et:**

`src/server.ts`-də:

```typescript
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'First Ring AI API',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true, // Token-i localStorage-da saxla
    },
  })
);
```

### **Dark theme əlavə et:**

```typescript
customCss: `
  .swagger-ui .topbar { display: none }
  .swagger-ui { background: #1a1a1a; }
  .swagger-ui .info { color: #fff; }
`,
```

---

## 🔍 SWAGGER BEST PRACTICES

### **1. Hər endpoint üçün:**
- ✅ Summary (qısa izah)
- ✅ Description (ətraflı izah)
- ✅ Tags (qruplaşdırma)
- ✅ Parameters (əgər varsa)
- ✅ Request body (POST/PUT üçün)
- ✅ Responses (200, 400, 401, 404, 500)
- ✅ Examples (real data ilə)

### **2. Security:**
- ✅ Protected endpoint-lər üçün `bearerAuth` əlavə et
- ✅ Public endpoint-lər üçün security yox

### **3. Schemas:**
- ✅ Reusable schema-lar yarat
- ✅ `$ref` istifadə et (copy-paste əvəzinə)
- ✅ Required field-ləri göstər
- ✅ Examples əlavə et

### **4. Error responses:**
- ✅ Bütün mümkün error kodları dokumentləşdir
- ✅ Error schema-ları consistency saxla

---

## 📊 SWAGGER VS POSTMAN

| Feature | Swagger | Postman |
|---------|---------|---------|
| Documentation | ✅ Auto-generated | ❌ Manual |
| Testing | ✅ Browser-based | ✅ Desktop app |
| Collaboration | ✅ URL share | ✅ Workspace share |
| Code Generation | ✅ Built-in | ✅ Via plugins |
| Environment Variables | ❌ No | ✅ Yes |
| Collections | ❌ No | ✅ Yes |

**Recommendation:** İkisini də istifadə et!
- Swagger → Documentation
- Postman → Testing & Development

---

## 🎯 NÖVBƏTI ADDIMLAR

### **1. Qalan modullar üçün Swagger əlavə et:**
```
☐ Tenants routes
☐ Services routes
☐ FAQs routes
☐ Bookings routes
☐ Orders routes
☐ Calls routes
☐ AI Agent routes
☐ Integrations routes
☐ Analytics routes
```

### **2. Test et:**
```bash
# Server başlat
npm run dev

# Browser-də aç
http://localhost:5000/api/docs

# Hər endpoint-i test et
```

### **3. Production:**
```typescript
// Production URL əlavə et swagger.ts-ə
servers: [
  {
    url: 'http://localhost:5000',
    description: 'Development',
  },
  {
    url: 'https://api.firstringai.com',
    description: 'Production',
  },
],
```

---

## 🐛 TROUBLESHOOTING

### **Problem: Swagger page boşdur**
```bash
# swagger.ts-də path yoxla
apis: ['./src/modules/**/*.routes.ts']

# TypeScript build et
npm run build
```

### **Problem: Annotations görsənmir**
```typescript
// JSDoc comment /** */ istifadə et
// Regular comment // deyil

/**
 * @swagger
 * ...
 */
```

### **Problem: Schema tapılmır**
```typescript
// $ref path-i yoxla
$ref: '#/components/schemas/User' // ✅ Doğru
$ref: 'User' // ❌ Yanlış
```

---

## 📚 ƏLAVƏ RESURSLAR

- [Swagger Official Docs](https://swagger.io/docs/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/) - Online editor
- [swagger-jsdoc GitHub](https://github.com/Surnet/swagger-jsdoc)

---

## ✅ NƏTİCƏ

Swagger hazırdır! ✅

İndi:
- ✅ Interactive API documentation
- ✅ Real-time testing
- ✅ Auto-generated schemas
- ✅ Postman export
- ✅ Auth module fully documented
- ✅ Leads module fully documented

**Növbəti:** Qalan modullar üçün annotations əlavə et!

---

Made with ❤️ by First Ring AI Team
