-- AlterTable
ALTER TABLE "User" ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "location" JSONB,
ADD COLUMN     "tags" TEXT[];
