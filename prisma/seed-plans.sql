-- Seed Plan table with 4-tier pricing structure
-- Run this with: psql -U username -d dbname -f prisma/seed-plans.sql

-- Clear existing plans (optional - remove if you want to keep existing data)
-- DELETE FROM "Plan";

-- Insert Starter Plan
INSERT INTO "Plan" (
  id, slug, name, description, price, "yearlyPrice", "stripeProductId", "callMinutes", "maxCalls", "maxUsers",
  "maxPhoneLines", "hasUnlimitedPhoneLines", "overageRatePerMinute", features,
  "isActive", "isPopular", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'starter',
  'Starter Plan',
  'Designed for small businesses. One AI phone line with essential features.',
  500,
  NULL,
  'prod_TmUFzafP1HCW08',
  1000,
  2000,
  1,
  1,
  false,
  0.75,
  '["One AI phone line", "Up to 1,000 monthly minutes", "Inbound call answering", "Order & reservation taking", "Business hours routing", "Email support"]'::jsonb,
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  "stripeProductId" = EXCLUDED."stripeProductId",
  "callMinutes" = EXCLUDED."callMinutes",
  "maxPhoneLines" = EXCLUDED."maxPhoneLines",
  "hasUnlimitedPhoneLines" = EXCLUDED."hasUnlimitedPhoneLines",
  "overageRatePerMinute" = EXCLUDED."overageRatePerMinute",
  features = EXCLUDED.features,
  "updatedAt" = NOW();

-- Insert Professional Plan
INSERT INTO "Plan" (
  id, slug, name, description, price, "yearlyPrice", "stripeProductId", "callMinutes", "maxCalls", "maxUsers",
  "maxPhoneLines", "hasUnlimitedPhoneLines", "overageRatePerMinute", features,
  "isActive", "isPopular", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'professional',
  'Professional Plan',
  'Designed for growing businesses. Up to three AI phone lines with advanced features.',
  1500,
  NULL,
  'prod_TmUI3uuw8nKYvr',
  3000,
  6000,
  5,
  3,
  false,
  0.75,
  '["Up to three AI phone lines", "Up to 3,000 monthly minutes", "Advanced call flows", "After-hours handling", "CRM & booking system integrations", "Priority support"]'::jsonb,
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  "stripeProductId" = EXCLUDED."stripeProductId",
  "callMinutes" = EXCLUDED."callMinutes",
  "maxPhoneLines" = EXCLUDED."maxPhoneLines",
  "hasUnlimitedPhoneLines" = EXCLUDED."hasUnlimitedPhoneLines",
  "overageRatePerMinute" = EXCLUDED."overageRatePerMinute",
  features = EXCLUDED.features,
  "isPopular" = EXCLUDED."isPopular",
  "updatedAt" = NOW();

-- Insert Enterprise Plan
INSERT INTO "Plan" (
  id, slug, name, description, price, "yearlyPrice", "stripeProductId", "callMinutes", "maxCalls", "maxUsers",
  "maxPhoneLines", "hasUnlimitedPhoneLines", "overageRatePerMinute", features,
  "isActive", "isPopular", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'enterprise',
  'Enterprise Plan',
  'Built for multi-location businesses and clinics. Up to ten AI phone lines.',
  3000,
  NULL,
  'prod_TmULjPlu2aqieY',
  6000,
  12000,
  20,
  10,
  false,
  0.60,
  '["Up to ten AI phone lines", "Up to 6,000 monthly minutes", "Custom call logic by department", "Analytics reporting", "Booking & payment routing", "Dedicated onboarding", "SLA-backed support"]'::jsonb,
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  "stripeProductId" = EXCLUDED."stripeProductId",
  "callMinutes" = EXCLUDED."callMinutes",
  "maxPhoneLines" = EXCLUDED."maxPhoneLines",
  "hasUnlimitedPhoneLines" = EXCLUDED."hasUnlimitedPhoneLines",
  "overageRatePerMinute" = EXCLUDED."overageRatePerMinute",
  features = EXCLUDED.features,
  "updatedAt" = NOW();

-- Insert Executive Plan
INSERT INTO "Plan" (
  id, slug, name, description, price, "yearlyPrice", "stripeProductId", "callMinutes", "maxCalls", "maxUsers",
  "maxPhoneLines", "hasUnlimitedPhoneLines", "overageRatePerMinute", features,
  "isActive", "isPopular", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'executive',
  'Executive Plan',
  'For high-volume operators and brands. Unlimited AI phone lines with full customization.',
  5000,
  NULL,
  'prod_TmUMC9AweLww7l',
  12000,
  24000,
  50,
  NULL,
  true,
  0.50,
  '["Unlimited AI phone lines", "Up to 12,000 monthly minutes", "Fully customized AI behavior", "White-labeled deployment", "Advanced integrations", "Dedicated account manager", "24/7 premium support"]'::jsonb,
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  "stripeProductId" = EXCLUDED."stripeProductId",
  "callMinutes" = EXCLUDED."callMinutes",
  "maxPhoneLines" = EXCLUDED."maxPhoneLines",
  "hasUnlimitedPhoneLines" = EXCLUDED."hasUnlimitedPhoneLines",
  "overageRatePerMinute" = EXCLUDED."overageRatePerMinute",
  features = EXCLUDED.features,
  "updatedAt" = NOW();

-- Verify the results
SELECT slug, name, price, "stripeProductId", "callMinutes", "maxPhoneLines", "hasUnlimitedPhoneLines", "overageRatePerMinute", "isPopular"
FROM "Plan"
ORDER BY price;
