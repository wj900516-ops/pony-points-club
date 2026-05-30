"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff, AuthError, ForbiddenError } from "@/lib/permissions";
import { addPointsSchema, customAdjustSchema, voidTransactionSchema } from "@/lib/validations";
import { getTier } from "@/lib/points";
import { writeAudit } from "@/lib/audit";

export type MutationResult = { ok: boolean; error?: string };

function denyMessage(e: unknown): MutationResult | null {
  if (e instanceof AuthError) return { ok: false, error: "请先登录" };
  if (e instanceof ForbiddenError) return { ok: false, error: "无权操作" };
  return null;
}

// 给指定老板加积分（固定档位）：仅 owner/admin。后端强制校验权限 + 档位。
export async function addPointsAction(
  formData: FormData
): Promise<MutationResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    const denied = denyMessage(e);
    if (denied) return denied;
    throw e;
  }

  const parsed = addPointsSchema.safeParse({
    bossId: formData.get("bossId"),
    tier: formData.get("tier"),
  });
  if (!parsed.success) {
    return { ok: false, error: "参数有误" };
  }

  const tier = getTier(parsed.data.tier);
  if (!tier) return { ok: false, error: "无效的积分档位" };

  const boss = await prisma.boss.findUnique({
    where: { id: parsed.data.bossId },
  });
  if (!boss) return { ok: false, error: "老板不存在" };
  if (boss.deletedAt) return { ok: false, error: "该老板已删除，无法加分" };
  if (!boss.isActive) return { ok: false, error: "该老板已归档，无法加分" };

  const delta = new Prisma.Decimal(tier.points);

  // 事务：写流水 + 累加总分（金额由服务端档位表决定，绝不信任前端数值）
  await prisma.$transaction([
    prisma.pointTransaction.create({
      data: {
        bossId: boss.id,
        type: "PURCHASE",
        priceTier: new Prisma.Decimal(tier.price),
        pointsAdded: delta,
        pointsDelta: delta,
        status: "ACTIVE",
        createdById: staff.id,
      },
    }),
    prisma.boss.update({
      where: { id: boss.id },
      data: { totalPoints: { increment: delta } },
    }),
  ]);

  revalidatePath("/points");
  revalidatePath("/admin");
  return { ok: true };
}

// 自定义增加 / 扣除积分：必须填原因。扣除默认不允许负分（owner 可放行）。
export async function customAdjustAction(
  formData: FormData
): Promise<MutationResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    const denied = denyMessage(e);
    if (denied) return denied;
    throw e;
  }

  const parsed = customAdjustSchema.safeParse({
    bossId: formData.get("bossId"),
    direction: formData.get("direction"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    allowNegative: formData.get("allowNegative") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "参数有误" };
  }

  const { bossId, direction, amount, reason } = parsed.data;
  // 仅 owner 可以放行负分
  const allowNegative = parsed.data.allowNegative === true && staff.role === "OWNER";

  const boss = await prisma.boss.findUnique({ where: { id: bossId } });
  if (!boss) return { ok: false, error: "老板不存在" };
  if (boss.deletedAt) return { ok: false, error: "该老板已删除，无法调整积分" };
  if (!boss.isActive) return { ok: false, error: "该老板已归档，无法调整积分" };

  const amountDec = new Prisma.Decimal(amount);
  const delta = direction === "ADD" ? amountDec : amountDec.negated();

  if (direction === "DEDUCT" && !allowNegative) {
    const after = new Prisma.Decimal(boss.totalPoints).plus(delta);
    if (after.lessThan(0)) {
      return {
        ok: false,
        error: "扣除后积分将为负数，已阻止（仅主理人可勾选允许负分）",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.pointTransaction.create({
      data: {
        bossId: boss.id,
        type: direction === "ADD" ? "MANUAL_ADD" : "MANUAL_DEDUCT",
        priceTier: null,
        pointsAdded: delta,
        pointsDelta: delta,
        status: "ACTIVE",
        note: reason,
        createdById: staff.id,
      },
    });
    await tx.boss.update({
      where: { id: boss.id },
      data: { totalPoints: { increment: delta } },
    });
    await writeAudit(tx, {
      action: direction === "ADD" ? "POINT_MANUAL_ADD" : "POINT_MANUAL_DEDUCT",
      entityType: "Boss",
      entityId: boss.id,
      operatorId: staff.id,
      detail: { amount, direction, reason },
    });
  });

  revalidatePath("/points");
  revalidatePath("/admin");
  return { ok: true };
}

// 撤销一条流水：软作废原记录 + 生成反向流水 + 更新总分（原子）。
export async function voidTransactionAction(
  formData: FormData
): Promise<MutationResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    const denied = denyMessage(e);
    if (denied) return denied;
    throw e;
  }

  const parsed = voidTransactionSchema.safeParse({
    transactionId: formData.get("transactionId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "参数有误" };
  }

  const { transactionId, reason } = parsed.data;

  const original = await prisma.pointTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!original) return { ok: false, error: "记录不存在" };
  if (original.status === "VOIDED") {
    return { ok: false, error: "该记录已撤销，不能重复撤销" };
  }
  if (original.type === "REVERSAL") {
    return { ok: false, error: "撤销流水本身不可再次撤销" };
  }

  // 反向积分 = 原始变化的相反数
  const reverseDelta = new Prisma.Decimal(original.pointsDelta).negated();

  try {
    await prisma.$transaction(async (tx) => {
      // 1) 标记原记录已作废
      await tx.pointTransaction.update({
        where: { id: original.id },
        data: {
          status: "VOIDED",
          voidedAt: new Date(),
          voidedById: staff.id,
          voidReason: reason,
        },
      });
      // 2) 生成反向流水（指向原记录，reversedTransactionId 唯一 → 防止重复撤销）
      await tx.pointTransaction.create({
        data: {
          bossId: original.bossId,
          type: "REVERSAL",
          priceTier: null,
          pointsAdded: reverseDelta,
          pointsDelta: reverseDelta,
          status: "ACTIVE",
          note: `撤销：${reason}`,
          createdById: staff.id,
          reversedTransactionId: original.id,
          rewardItemId: original.rewardItemId,
        },
      });
      // 3) 更新老板总分
      await tx.boss.update({
        where: { id: original.bossId },
        data: { totalPoints: { increment: reverseDelta } },
      });
      // 4) 审计
      await writeAudit(tx, {
        action: "POINT_VOID",
        entityType: "PointTransaction",
        entityId: original.id,
        operatorId: staff.id,
        detail: { reason, reversedDelta: reverseDelta.toString() },
      });
    });
  } catch (e) {
    // reversedTransactionId 唯一约束冲突 → 已被撤销
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "该记录已撤销，不能重复撤销" };
    }
    throw e;
  }

  revalidatePath("/points");
  revalidatePath("/admin");
  return { ok: true };
}
