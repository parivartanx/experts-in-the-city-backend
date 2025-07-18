/*
  Warnings:

  - You are about to drop the `PostReport` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'USER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REPORT';

-- DropForeignKey
ALTER TABLE "PostReport" DROP CONSTRAINT "PostReport_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostReport" DROP CONSTRAINT "PostReport_reporterId_fkey";

-- DropTable
DROP TABLE "PostReport";

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "reportedUserId" TEXT,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_postId_idx" ON "Report"("postId");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
