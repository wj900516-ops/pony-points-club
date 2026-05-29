"use server";

import { prisma } from "@/lib/prisma";

export interface HistoryRow {
  id: string;
  createdAt: string; // ISO 字符串，前端格式化
  priceTier: string; // "49.9"
  pointsAdded: string; // "0.2"
  createdBy: string; // 邮箱或昵称
}

// 读取某个老板的积分历史。公开可读（游客也能看），无需登录。
export async function fetchBossHistory(bossId: string): Promise<HistoryRow[]> {
  if (!bossId) return [];
  const rows = await prisma.pointTransaction.findMany({
    where: { bossId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      createdBy: { select: { displayName: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    priceTier: r.priceTier.toString(),
    pointsAdded: r.pointsAdded.toString(),
    createdBy: r.createdBy?.displayName || r.createdBy?.email || "未知",
  }));
}
