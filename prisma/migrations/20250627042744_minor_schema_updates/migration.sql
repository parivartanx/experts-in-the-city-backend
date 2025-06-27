/*
  Warnings:

  - The `expertise` column on the `ExpertDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `interests` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ExpertDetails" DROP COLUMN "expertise",
ADD COLUMN     "expertise" TEXT[];

-- AlterTable
ALTER TABLE "User" DROP COLUMN "interests",
ADD COLUMN     "interests" TEXT[];

-- DropEnum
DROP TYPE "Expertise";
