-- AlterTable
ALTER TABLE "User" 
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" SET DATA TYPE "Role"[] USING ARRAY["role"]::"Role"[],
  ALTER COLUMN "role" SET DEFAULT ARRAY['STUDENT']::"Role"[];
