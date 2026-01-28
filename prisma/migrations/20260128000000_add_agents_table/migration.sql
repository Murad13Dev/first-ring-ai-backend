-- =============================================
-- 1. CREATE AGENTS TABLE (Multi-agent support)
-- =============================================
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "retellAgentId" TEXT,
    "name" TEXT,
    "systemPrompt" TEXT,
    "voiceGender" TEXT NOT NULL DEFAULT 'male',
    "voiceId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en-US',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "enabledTools" JSONB,
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- 2. ADD maxAgents TO PLANS TABLE
-- =============================================
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "maxAgents" INTEGER NOT NULL DEFAULT 1;

-- Update existing plans with appropriate maxAgents values
UPDATE "plans" SET "maxAgents" = 1 WHERE "slug" = 'starter';
UPDATE "plans" SET "maxAgents" = 3 WHERE "slug" = 'professional';
UPDATE "plans" SET "maxAgents" = 10 WHERE "slug" = 'enterprise';
UPDATE "plans" SET "maxAgents" = 100 WHERE "slug" = 'executive';

-- =============================================
-- 3. ADD agentId TO CALLS TABLE
-- =============================================
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "agentId" TEXT;

-- =============================================
-- 4. DROP OLD TENANT AGENT FIELDS (moved to agents table)
-- =============================================
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "customAgentName";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "customAgentPrompt";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "agentVoiceGender";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "agentVoiceId";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "agentTemperature";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "enabledTools";

-- =============================================
-- 5. CREATE INDEXES
-- =============================================
CREATE UNIQUE INDEX "agents_retellAgentId_key" ON "agents"("retellAgentId");
CREATE INDEX "agents_tenantId_idx" ON "agents"("tenantId");
CREATE INDEX "agents_retellAgentId_idx" ON "agents"("retellAgentId");
CREATE INDEX IF NOT EXISTS "calls_agentId_idx" ON "calls"("agentId");

-- =============================================
-- 6. ADD FOREIGN KEYS
-- =============================================
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calls" ADD CONSTRAINT "calls_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
