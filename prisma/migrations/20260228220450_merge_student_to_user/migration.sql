/*
  Warnings:

  - You are about to drop the column `studentId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the `Student` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'TUTOR';
ALTER TYPE "Role" ADD VALUE 'STUDENT';

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_studentId_fkey";

-- DropIndex
DROP INDEX "Subscription_studentId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "studentId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "studentId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Student";

-- CreateTable
CREATE TABLE "UserTutor" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,

    CONSTRAINT "UserTutor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTutor_tutorId_studentId_key" ON "UserTutor"("tutorId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- AddForeignKey
ALTER TABLE "UserTutor" ADD CONSTRAINT "UserTutor_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTutor" ADD CONSTRAINT "UserTutor_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
