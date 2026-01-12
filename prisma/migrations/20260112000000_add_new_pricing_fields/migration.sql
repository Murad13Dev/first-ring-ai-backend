-- AlterTable: Add new pricing fields to Plan model
ALTER TABLE "plans" ADD COLUMN "maxPhoneLines" INTEGER;
ALTER TABLE "plans" ADD COLUMN "hasUnlimitedPhoneLines" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN "overageRatePerMinute" DOUBLE PRECISION;

-- AlterTable: Add overage tracking to UsageRecord model
ALTER TABLE "usage_records" ADD COLUMN "overageMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "usage_records" ADD COLUMN "overageCharges" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN "plans"."maxPhoneLines" IS 'Number of AI phone lines (1, 3, 10, null for unlimited)';
COMMENT ON COLUMN "plans"."hasUnlimitedPhoneLines" IS 'True for Executive plan with unlimited phone lines';
COMMENT ON COLUMN "plans"."overageRatePerMinute" IS 'Cost per minute beyond callMinutes limit ($0.50-$0.75)';
COMMENT ON COLUMN "usage_records"."overageMinutes" IS 'Minutes used beyond the plan limit';
COMMENT ON COLUMN "usage_records"."overageCharges" IS 'Total charges for overage usage';
