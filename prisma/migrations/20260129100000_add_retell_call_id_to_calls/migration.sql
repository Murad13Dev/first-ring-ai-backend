-- AlterTable: Add Retell fields to calls table
ALTER TABLE "calls" ADD COLUMN "retellCallId" TEXT;
ALTER TABLE "calls" ADD COLUMN "summary" TEXT;

-- AlterColumn: Make duration default to 0
ALTER TABLE "calls" ALTER COLUMN "duration" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "calls_retellCallId_key" ON "calls"("retellCallId");
CREATE INDEX "calls_retellCallId_idx" ON "calls"("retellCallId");
