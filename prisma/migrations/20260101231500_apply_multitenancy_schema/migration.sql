/*
  Warnings:

  - You are about to drop the column `providerId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Subscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,schoolId]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rut,schoolId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,schoolId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rut,schoolId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,schoolId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schoolId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `provider` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `schoolId` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rut` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rut` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADOPAGO', 'TOKU', 'PAYPAL', 'STRIPE');

-- DropIndex
DROP INDEX "Student_email_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "providerId",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "schoolId" TEXT NOT NULL,
DROP COLUMN "provider",
ADD COLUMN     "provider" "PaymentProvider" NOT NULL;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "isActive",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "rut" TEXT NOT NULL,
ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "providerId",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "provider" "PaymentProvider" NOT NULL,
ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rut" TEXT NOT NULL,
ADD COLUMN     "schoolId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_schoolId_key" ON "Plan"("name", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rut_schoolId_key" ON "Student"("rut", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_schoolId_key" ON "Student"("email", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "User_rut_schoolId_key" ON "User"("rut", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_schoolId_key" ON "User"("email", "schoolId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
