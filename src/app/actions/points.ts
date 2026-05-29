"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff, AuthError, ForbiddenError } from "@/lib/permissions";
import { addPointsSchema } from "@/lib/validations";
import { getTier } from "@/lib/points";

export type MutationResult = { ok: boolean; error?: string };

// 给指定老板加积分：仅 owner/admin。后端强制校验权限 + 档位。
export async function addPointsAction(
  formData: FormData
): Promise<MutationResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "请先登录" };
    if (e instanceof ForbiddenError) return { ok: false, error: "无权操作" };
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

  // 事务：写流水 + 累加总分（金额由服务端档位表决定，绝不信任前端数值）
  await prisma.$transaction([
    prisma.pointTransaction.create({
      data: {
        bossId: boss.id,
        priceTier: new Prisma.Decimal(tier.price),
        pointsAdded: new Prisma.Decimal(tier.points),
        createdById: staff.id,
      },
    }),
    prisma.boss.update({
      where: { id: boss.id },
      data: { totalPoints: { increment: new Prisma.Decimal(tier.points) } },
    }),
  ]);

  revalidatePath("/points");
  revalidatePath("/admin");
  return { ok: true };
}
