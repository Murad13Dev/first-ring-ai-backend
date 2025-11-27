-- AlterTable
ALTER TABLE "users" ADD COLUMN "adminApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedBy" TEXT;
