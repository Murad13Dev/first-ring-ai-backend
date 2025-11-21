-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "twilioNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Azerbaijan',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Baku',
    "website" TEXT,
    "businessHours" JSONB,
    "squareLocationId" TEXT,
    "googleCalendarId" TEXT,
    "googleSheetId" TEXT,
    "posConfig" JSONB,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "subscriptionId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "phone" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "campaign" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredContact" TEXT DEFAULT 'phone',
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT,
    "callVolume" INTEGER,
    "selectedPlan" TEXT NOT NULL,
    "challenges" TEXT,
    "requirements" TEXT,
    "budget" TEXT,
    "urgency" TEXT,
    "callId" TEXT,
    "callDuration" INTEGER,
    "callRecordingUrl" TEXT,
    "callTranscript" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "qualificationScore" INTEGER,
    "adminNotes" TEXT,
    "assignedToEmail" TEXT,
    "lostReason" TEXT,
    "convertedToTenantId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "nextFollowUp" TIMESTAMP(3),
    "lastContacted" TIMESTAMP(3),
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "modifiers" JSONB,
    "stockQuantity" INTEGER,
    "lowStockAlert" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[],
    "category" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "partySize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "specialRequests" TEXT,
    "googleEventId" TEXT,
    "externalBookingId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "squarePaymentId" TEXT,
    "checkoutUrl" TEXT,
    "externalOrderId" TEXT,
    "posStatus" TEXT,
    "deliveryType" TEXT,
    "deliveryAddress" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "preparedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "intent" TEXT,
    "outcome" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "sentiment" TEXT,
    "bookingId" TEXT,
    "orderId" TEXT,
    "leadId" TEXT,
    "metadata" JSONB,
    "callQuality" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "reactivationSentAt" TIMESTAMP(3),
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedAgentId" TEXT,
    "transferredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableNumber" TEXT,
    "locationId" TEXT,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "delayMinutes" INTEGER NOT NULL DEFAULT 30,
    "channel" TEXT NOT NULL DEFAULT 'sms',
    "template" TEXT NOT NULL,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "customerId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "data" JSONB,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_twilioNumber_key" ON "tenants"("twilioNumber");

-- CreateIndex
CREATE INDEX "tenants_email_idx" ON "tenants"("email");

-- CreateIndex
CREATE INDEX "tenants_twilioNumber_idx" ON "tenants"("twilioNumber");

-- CreateIndex
CREATE INDEX "tenants_plan_idx" ON "tenants"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_priority_idx" ON "leads"("priority");

-- CreateIndex
CREATE INDEX "leads_source_idx" ON "leads"("source");

-- CreateIndex
CREATE INDEX "services_tenantId_idx" ON "services"("tenantId");

-- CreateIndex
CREATE INDEX "services_category_idx" ON "services"("category");

-- CreateIndex
CREATE INDEX "services_available_idx" ON "services"("available");

-- CreateIndex
CREATE INDEX "faqs_tenantId_idx" ON "faqs"("tenantId");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

-- CreateIndex
CREATE INDEX "bookings_tenantId_idx" ON "bookings"("tenantId");

-- CreateIndex
CREATE INDEX "bookings_dateTime_idx" ON "bookings"("dateTime");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_customerPhone_idx" ON "bookings"("customerPhone");

-- CreateIndex
CREATE INDEX "orders_tenantId_idx" ON "orders"("tenantId");

-- CreateIndex
CREATE INDEX "orders_customerPhone_idx" ON "orders"("customerPhone");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "calls_tenantId_idx" ON "calls"("tenantId");

-- CreateIndex
CREATE INDEX "calls_fromNumber_idx" ON "calls"("fromNumber");

-- CreateIndex
CREATE INDEX "calls_intent_idx" ON "calls"("intent");

-- CreateIndex
CREATE INDEX "calls_createdAt_idx" ON "calls"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "activity_logs_tenantId_idx" ON "activity_logs"("tenantId");

-- CreateIndex
CREATE INDEX "activity_logs_actorId_idx" ON "activity_logs"("actorId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_phone_key" ON "customers"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "chat_sessions_tenantId_idx" ON "chat_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "chat_sessions_status_idx" ON "chat_sessions"("status");

-- CreateIndex
CREATE INDEX "chat_messages_sessionId_idx" ON "chat_messages"("sessionId");

-- CreateIndex
CREATE INDEX "chat_messages_channel_idx" ON "chat_messages"("channel");

-- CreateIndex
CREATE INDEX "qr_codes_tenantId_idx" ON "qr_codes"("tenantId");

-- CreateIndex
CREATE INDEX "qr_codes_status_idx" ON "qr_codes"("status");

-- CreateIndex
CREATE INDEX "follow_up_configs_tenantId_idx" ON "follow_up_configs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_configs_tenantId_type_key" ON "follow_up_configs"("tenantId", "type");

-- CreateIndex
CREATE INDEX "follow_up_jobs_tenantId_idx" ON "follow_up_jobs"("tenantId");

-- CreateIndex
CREATE INDEX "follow_up_jobs_status_idx" ON "follow_up_jobs"("status");

-- CreateIndex
CREATE INDEX "follow_up_jobs_scheduledFor_idx" ON "follow_up_jobs"("scheduledFor");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
