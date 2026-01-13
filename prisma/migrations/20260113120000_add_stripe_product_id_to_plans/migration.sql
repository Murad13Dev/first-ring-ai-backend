-- AlterTable: Add Stripe product ID to Plan model
ALTER TABLE "plans" ADD COLUMN "stripeProductId" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "plans"."stripeProductId" IS 'Stripe product ID (e.g., prod_xxx)';
