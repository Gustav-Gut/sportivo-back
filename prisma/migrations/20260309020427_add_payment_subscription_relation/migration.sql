/*
  Warnings:

  - You are about to drop the column `schedule` on the `Lesson` table. All the data in the column will be lost.
  - Made the column `coachId` on table `Lesson` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `dayOfWeek` to the `Lesson` table without a default value. This is not possible if the table is not empty.
  - Made the column `startTime` on table `Lesson` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endTime` on table `Lesson` required. This step will fail if there are existing NULL values in that column.
  - Made the column `maxStudents` on table `Lesson` required. This step will fail if there are existing NULL values in that column.
  - Made the column `facilityId` on table `Lesson` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `subscriptionId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_coachId_fkey";

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_facilityId_fkey";

-- DropIndex
DROP INDEX "Subscription_studentId_key";

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "schedule",
ALTER COLUMN "coachId" SET NOT NULL,
DROP COLUMN "dayOfWeek",
ADD COLUMN     "dayOfWeek" "DayOfWeek" NOT NULL,
ALTER COLUMN "startTime" SET NOT NULL,
ALTER COLUMN "startTime" SET DATA TYPE TEXT,
ALTER COLUMN "endTime" SET NOT NULL,
ALTER COLUMN "endTime" SET DATA TYPE TEXT,
ALTER COLUMN "maxStudents" SET NOT NULL,
ALTER COLUMN "facilityId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "subscriptionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
