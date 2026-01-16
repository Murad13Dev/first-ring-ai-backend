-- AlterTable
ALTER TABLE "users" ADD COLUMN "temporaryPassword" TEXT,
ADD COLUMN "temporaryPasswordExpires" TIMESTAMP(3),
ADD COLUMN "temporaryPasswordUsed" BOOLEAN NOT NULL DEFAULT false;
