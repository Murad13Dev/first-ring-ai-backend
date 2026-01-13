-- CreateTable: CertifiedRep
CREATE TABLE "certified_reps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whopMemberId" TEXT,
    "whopProductId" TEXT,
    "whopSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "discordUserId" TEXT,
    "discordRoleId" TEXT,
    "discordRoleName" TEXT,
    "accessGrantedAt" TIMESTAMP(3),
    "accessRevokedAt" TIMESTAMP(3),
    "subscriptionActive" BOOLEAN NOT NULL DEFAULT false,
    "lastPaymentAt" TIMESTAMP(3),
    "paymentFailedAt" TIMESTAMP(3),
    "totalClients" INTEGER NOT NULL DEFAULT 0,
    "activeClients" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifetimeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certified_reps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RepClient
CREATE TABLE "rep_clients" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "businessType" TEXT,
    "setupFee" DOUBLE PRECISION,
    "monthlyFee" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "tenantId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "notes" TEXT,
    "dealValue" DOUBLE PRECISION,
    "closeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rep_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certified_reps_userId_key" ON "certified_reps"("userId");
CREATE UNIQUE INDEX "certified_reps_whopMemberId_key" ON "certified_reps"("whopMemberId");
CREATE UNIQUE INDEX "certified_reps_discordUserId_key" ON "certified_reps"("discordUserId");
CREATE INDEX "certified_reps_userId_idx" ON "certified_reps"("userId");
CREATE INDEX "certified_reps_whopMemberId_idx" ON "certified_reps"("whopMemberId");
CREATE INDEX "certified_reps_status_idx" ON "certified_reps"("status");
CREATE INDEX "certified_reps_subscriptionActive_idx" ON "certified_reps"("subscriptionActive");

CREATE UNIQUE INDEX "rep_clients_tenantId_key" ON "rep_clients"("tenantId");
CREATE INDEX "rep_clients_repId_idx" ON "rep_clients"("repId");
CREATE INDEX "rep_clients_status_idx" ON "rep_clients"("status");
CREATE INDEX "rep_clients_tenantId_idx" ON "rep_clients"("tenantId");

-- AddForeignKey
ALTER TABLE "certified_reps" ADD CONSTRAINT "certified_reps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_clients" ADD CONSTRAINT "rep_clients_repId_fkey" FOREIGN KEY ("repId") REFERENCES "certified_reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comments
COMMENT ON TABLE "certified_reps" IS 'Certified Rep program members ($997 subscription)';
COMMENT ON TABLE "rep_clients" IS 'Clients managed by Certified Reps';
COMMENT ON COLUMN "certified_reps"."status" IS 'pending | active | suspended | cancelled';
COMMENT ON COLUMN "rep_clients"."status" IS 'prospect | demo_scheduled | proposal_sent | active | churned';
