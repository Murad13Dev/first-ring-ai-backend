-- AddAiCallDataToLead and MakeBookingFieldsOptional
-- Add aiCallData JSON field to Lead model
-- Make customerPhone and tenantId optional in Booking model

-- AlterTable: Add aiCallData column to leads
ALTER TABLE "leads" ADD COLUMN "aiCallData" JSONB;

-- AlterTable: Make customerPhone and tenantId optional in bookings
-- Note: These fields already exist, we're just making them nullable
ALTER TABLE "bookings" ALTER COLUMN "customerPhone" DROP NOT NULL;
ALTER TABLE "bookings" ALTER COLUMN "tenantId" DROP NOT NULL;
