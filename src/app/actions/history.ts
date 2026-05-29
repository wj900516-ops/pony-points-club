"use server";

import { prisma } from "@/lib/prisma";
import { transactionTypeLabel } from "@/lib/points";

export interface HistoryRow {
  id: string;
  createdAt: string; // ISO 字符串，前端格式化
  type: string; // PURCHASE / MANUAL_ADD / MANUAL_DEDUCT / REDEMPTION / REVERSAL
  typeLabel: string; // 中文类型
  priceTier: string | null; // "49.9" 或 null
  rewardName: string | null; // 兑换商品名
  pointsDelta: string; // 带符号，正=增加 负=扣除
  status: string; // ACTIVE / VOIDED
  note: string | null;
  createdBy: string; // 操作人 昵称/邮箱
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  canVoid: boolean; // ACTIVE 且非反向流水
}

// 读取某个老板的积分历史。公开可读（游客也能看），无需登录。
export async function fetchBossHistory(bossId: string): Promise<HistoryRow[]> {
  if (!bossId) return [];
  const rows = await prisma.pointTransaction.findMany({
    where: { bossId },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      createdBy: { select: { displayName: true, email: true } },
      voidedBy: { select: { displayName: true, email: true } },
      rewardItem: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    type: r.type,
    typeLabel: transactionTypeLabel(r.type),
    priceTier: r.priceTier ? r.priceTier.toString() : null,
    rewardName: r.rewardItem?.name ?? null,
    pointsDelta: r.pointsDelta.toString(),
    status: r.status,
    note: r.note ?? null,
    createdBy: r.createdBy?.displayName || r.createdBy?.email || "未知",
    voidedAt: r.voidedAt ? r.voidedAt.toISOString() : null,
    voidedBy: r.voidedBy?.displayName || r.voidedBy?.email || null,
    voidReason: r.voidReason ?? null,
    canVoid: r.status === "ACTIVE" && r.type !== "REVERSAL",
  }));
}
