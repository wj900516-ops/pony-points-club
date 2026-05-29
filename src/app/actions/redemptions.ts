"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff, AuthError, ForbiddenError } from "@/lib/permissions";
import { redeemSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";
import type { MutationResult } from "@/app/actions/points";

// 后台兑换：老板无权自助兑换，全部由 owner/admin 操作。
export async function redeemAction(formData: FormData): Promise<MutationResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "请先登录" };
    if (e instanceof ForbiddenError) return { ok: false, error: "无权操作" };
    throw e;
  }

  const parsed = redeemSchema.safeParse({
    bossId: formData.get("bossId"),
    rewardItemId: formData.get("rewardItemId"),
    quantity: formData.get("quantity") ?? 1,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "参数有误" };
  }
  const { bossId, rewardItemId, quantity, note } = parsed.data;

  const [boss, item] = await Promise.all([
    prisma.boss.findUnique({ where: { id: bossId } }),
    prisma.rewardItem.findUnique({ where: { id: rewardItemId } }),
  ]);
  if (!boss) return { ok: false, error: "老板不存在" };
  if (!item) return { ok: false, error: "商品不存在" };
  if (!item.isActive) return { ok: false, error: "该商品已下架，无法兑换" };
  if (item.stock < quantity) return { ok: false, error: "库存不足" };

  const pointsSpent = new Prisma.Decimal(item.pointsRequired).times(quantity);
  if (new Prisma.Decimal(boss.totalPoints).lessThan(pointsSpent)) {
    return { ok: false, error: "老板积分不足，无法兑换" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1) 兑换记录（含商品名快照、操作人）
      await tx.rewardRedemption.create({
        data: {
          rewardItemId: item.id,
          bossId: boss.id,
          rewardName: item.name,
          pointsSpent,
          quantity,
          createdById: staff.id,
          note: note || null,
        },
      });
      // 2) 扣库存（条件更新防止并发超扣）
      const stockUpdate = await tx.rewardItem.updateMany({
        where: { id: item.id, stock: { gte: quantity }, isActive: true },
        data: { stock: { decrement: quantity } },
      });
      if (stockUpdate.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError("库存不足", {
          code: "P2025",
          clientVersion: "x",
        });
      }
      // 3) 积分流水（兑换扣分）
      await tx.pointTransaction.create({
        data: {
          bossId: boss.id,
          type: "REDEMPTION",
          priceTier: null,
          pointsAdded: pointsSpent.negated(),
          pointsDelta: pointsSpent.negated(),
          status: "ACTIVE",
          note: `兑换：${item.name} ×${quantity}${note ? `（${note}）` : ""}`,
          rewardItemId: item.id,
          createdById: staff.id,
        },
      });
      // 4) 扣老板总分
      await tx.boss.update({
        where: { id: boss.id },
        data: { totalPoints: { decrement: pointsSpent } },
      });
      // 5) 审计
      await writeAudit(tx, {
        action: "REDEEM",
        entityType: "Boss",
        entityId: boss.id,
        operatorId: staff.id,
        detail: {
          rewardName: item.name,
          quantity,
          pointsSpent: pointsSpent.toString(),
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "库存不足" };
    }
    throw e;
  }

  revalidatePath("/points");
  revalidatePath("/admin");
  revalidatePath("/rewards");
  return { ok: true };
}

export interface RedemptionRow {
  id: string;
  createdAt: string;
  bossName: string;
  rewardName: string;
  pointsSpent: string;
  quantity: number;
  operator: string;
  note: string | null;
}

// 兑换历史（后台展示）
export async function fetchRedemptions(): Promise<RedemptionRow[]> {
  const rows = await prisma.rewardRedemption.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      boss: { select: { name: true } },
      rewardItem: { select: { name: true } },
      createdBy: { select: { displayName: true, email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    bossName: r.boss?.name ?? "（未知老板）",
    rewardName: r.rewardName || r.rewardItem?.name || "（商品已删除）",
    pointsSpent: r.pointsSpent.toString(),
    quantity: r.quantity,
    operator: r.createdBy?.displayName || r.createdBy?.email || "未知",
    note: r.note ?? null,
  }));
}
