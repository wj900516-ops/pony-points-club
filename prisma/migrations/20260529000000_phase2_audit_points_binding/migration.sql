-- Phase 2：积分流水审计、撤销、兑换、老板绑定、软删除/归档元数据、审计日志
-- 全部为「附加式」变更：新增列均可空或带安全默认值，不 DROP 任何旧列、不清空旧数据。

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'MANUAL_ADD', 'MANUAL_DEDUCT', 'REDEMPTION', 'REVERSAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- AlterTable
ALTER TABLE "bosses" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "point_transactions" ADD COLUMN     "pointsDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "reversedTransactionId" TEXT,
ADD COLUMN     "rewardItemId" TEXT,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" "TransactionType" NOT NULL DEFAULT 'PURCHASE',
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT,
ALTER COLUMN "priceTier" DROP NOT NULL;

-- Backfill：旧流水均为固定档位加分，pointsDelta = pointsAdded，
-- 保证 Boss.totalPoints 与 SUM(pointsDelta WHERE status='ACTIVE') 一致。
UPDATE "point_transactions" SET "pointsDelta" = "pointsAdded";

-- AlterTable
ALTER TABLE "reward_redemptions" ADD COLUMN     "bossId" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rewardName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "operatorId" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bosses_userId_key" ON "bosses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "point_transactions_reversedTransactionId_key" ON "point_transactions"("reversedTransactionId");

-- CreateIndex
CREATE INDEX "point_transactions_status_idx" ON "point_transactions"("status");

-- CreateIndex
CREATE INDEX "reward_redemptions_bossId_createdAt_idx" ON "reward_redemptions"("bossId", "createdAt");

-- CreateIndex
CREATE INDEX "reward_redemptions_createdAt_idx" ON "reward_redemptions"("createdAt");

-- AddForeignKey
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_reversedTransactionId_fkey" FOREIGN KEY ("reversedTransactionId") REFERENCES "point_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_rewardItemId_fkey" FOREIGN KEY ("rewardItemId") REFERENCES "reward_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardItemId_fkey" FOREIGN KEY ("rewardItemId") REFERENCES "reward_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "bosses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
