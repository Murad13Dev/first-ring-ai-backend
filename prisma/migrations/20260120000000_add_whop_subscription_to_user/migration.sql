-- AlterTable
ALTER TABLE "users" ADD COLUMN "whopMembershipId" TEXT,
ADD COLUMN "whopProductId" TEXT,
ADD COLUMN "whopSubscriptionId" TEXT,
ADD COLUMN "whopSubscriptionActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whopSubscriptionExpiry" TIMESTAMP(3),
ADD COLUMN "whopLastCheckedAt" TIMESTAMP(3),
ADD COLUMN "whopGracePeriodEnds" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_whopMembershipId_key" ON "users"("whopMembershipId");
