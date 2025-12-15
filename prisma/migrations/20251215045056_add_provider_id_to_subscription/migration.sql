-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "providerId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
