-- CreateTable
CREATE TABLE "tenant_integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "discordEnabled" BOOLEAN NOT NULL DEFAULT false,
    "discordWebhookUrl" TEXT,
    "discordBotToken" TEXT,
    "discordGuildId" TEXT,
    "discordClientId" TEXT,
    "discordClientSecret" TEXT,
    "notifyOnNewOrder" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnPaymentSuccess" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnPaymentFailed" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnOrderReady" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnAICall" BOOLEAN NOT NULL DEFAULT false,
    "dailyReportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyReportTime" TEXT,
    "whopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whopApiKey" TEXT,
    "whopCompanyId" TEXT,
    "whopWebhookSecret" TEXT,
    "whopAutoGrantAccess" BOOLEAN NOT NULL DEFAULT true,
    "productMappings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_grants" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "discordUserId" TEXT,
    "discordUsername" TEXT,
    "discordRoleId" TEXT,
    "discordRoleName" TEXT,
    "whopMembershipId" TEXT,
    "whopProductId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_events" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "accessGrantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whop_products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "whopProductId" TEXT NOT NULL,
    "whopCompanyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL,
    "billingPeriod" TEXT,
    "discordRoleId" TEXT,
    "discordRoleName" TEXT,
    "accessDuration" INTEGER,
    "serviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whop_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_integrations_tenantId_key" ON "tenant_integrations"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_integrations_tenantId_idx" ON "tenant_integrations"("tenantId");

-- CreateIndex
CREATE INDEX "access_grants_integrationId_idx" ON "access_grants"("integrationId");

-- CreateIndex
CREATE INDEX "access_grants_orderId_idx" ON "access_grants"("orderId");

-- CreateIndex
CREATE INDEX "access_grants_discordUserId_idx" ON "access_grants"("discordUserId");

-- CreateIndex
CREATE INDEX "access_grants_status_idx" ON "access_grants"("status");

-- CreateIndex
CREATE INDEX "access_grants_expiresAt_idx" ON "access_grants"("expiresAt");

-- CreateIndex
CREATE INDEX "integration_events_integrationId_idx" ON "integration_events"("integrationId");

-- CreateIndex
CREATE INDEX "integration_events_source_idx" ON "integration_events"("source");

-- CreateIndex
CREATE INDEX "integration_events_eventType_idx" ON "integration_events"("eventType");

-- CreateIndex
CREATE INDEX "integration_events_status_idx" ON "integration_events"("status");

-- CreateIndex
CREATE INDEX "integration_events_createdAt_idx" ON "integration_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "whop_products_whopProductId_key" ON "whop_products"("whopProductId");

-- CreateIndex
CREATE INDEX "whop_products_tenantId_idx" ON "whop_products"("tenantId");

-- CreateIndex
CREATE INDEX "whop_products_whopProductId_idx" ON "whop_products"("whopProductId");

-- AddForeignKey
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "tenant_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "tenant_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
