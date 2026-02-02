-- CreateTable
CREATE TABLE "plan_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_stripePriceId_key" ON "plan_prices"("stripePriceId");

-- CreateIndex
CREATE INDEX "plan_prices_planId_idx" ON "plan_prices"("planId");

-- CreateIndex
CREATE INDEX "plan_prices_stripePriceId_idx" ON "plan_prices"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_planId_billingPeriod_key" ON "plan_prices"("planId", "billingPeriod");

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
