-- AddRetellAgentIdToTenant
-- Add retellAgentId field to Tenant model for storing Retell AI agent IDs

-- AlterTable: Add retellAgentId column
ALTER TABLE "tenants" ADD COLUMN "retellAgentId" TEXT;

-- CreateIndex: Add unique index for retellAgentId
CREATE UNIQUE INDEX "tenants_retellAgentId_key" ON "tenants"("retellAgentId");

-- CreateIndex: Add regular index for faster lookups
CREATE INDEX "tenants_retellAgentId_idx" ON "tenants"("retellAgentId");
