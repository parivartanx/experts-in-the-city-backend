/*
  Warnings:

  - The `expertise` column on the `ExpertDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `interests` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('VERIFIED_EXPERT', 'TOP_RATED', 'RISING_EXPERT', 'IN_DEMAND', 'ELITE_EXPERT', 'MULTICITY_EXPERT', 'QUICK_RESPONDER', 'COMMUNITY_CONTRIBUTOR', 'SPECIALIST', 'VERSATILE_PRO');

-- CreateEnum
CREATE TYPE "ProgressLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "SatisfactionLevel" AS ENUM ('VERY_DISSATISFIED', 'DISSATISFIED', 'NEUTRAL', 'SATISFIED', 'VERY_SATISFIED');

-- CreateEnum
CREATE TYPE "Expertise" AS ENUM ('TECHNOLOGY', 'BUSINESS', 'HEALTHCARE', 'EDUCATION', 'ARTS', 'SCIENCE', 'ENGINEERING', 'LAW', 'FINANCE', 'MARKETING', 'DESIGN', 'MEDIA', 'SPORTS', 'CULINARY', 'LANGUAGES', 'PSYCHOLOGY', 'ENVIRONMENT', 'AGRICULTURE', 'CONSTRUCTION', 'HOSPITALITY', 'RETAIL', 'TRANSPORTATION', 'ENTERTAINMENT', 'NON_PROFIT', 'GOVERNMENT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_SCHEDULE';
ALTER TYPE "NotificationType" ADD VALUE 'BADGE_EARNED';
ALTER TYPE "NotificationType" ADD VALUE 'SUGGESTION';

-- AlterTable
ALTER TABLE "ExpertDetails" ADD COLUMN     "badges" "BadgeType"[],
ADD COLUMN     "progressLevel" "ProgressLevel" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "progressShow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ratings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "expertise",
ADD COLUMN     "expertise" "Expertise"[];

-- AlterTable
ALTER TABLE "User" DROP COLUMN "interests",
ADD COLUMN     "interests" "Expertise"[];

-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionReview" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "satisfaction" "SatisfactionLevel",
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reply_commentId_idx" ON "Reply"("commentId");

-- CreateIndex
CREATE INDEX "Reply_authorId_idx" ON "Reply"("authorId");

-- CreateIndex
CREATE INDEX "SessionReview_reviewerId_idx" ON "SessionReview"("reviewerId");

-- CreateIndex
CREATE INDEX "SessionReview_expertId_idx" ON "SessionReview"("expertId");

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReview" ADD CONSTRAINT "SessionReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReview" ADD CONSTRAINT "SessionReview_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "ExpertDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
