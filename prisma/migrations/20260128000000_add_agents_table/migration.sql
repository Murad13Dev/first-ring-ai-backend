-- CreateTable
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

-- Add agentId to calls table
ALTER TABLE "calls" ADD COLUMN "agentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "agents_retellAgentId_key" ON "agents"("retellAgentId");

-- CreateIndex
CREATE INDEX "agents_tenantId_idx" ON "agents"("tenantId");

-- CreateIndex
CREATE INDEX "agents_retellAgentId_idx" ON "agents"("retellAgentId");

-- CreateIndex
CREATE INDEX "calls_agentId_idx" ON "calls"("agentId");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
