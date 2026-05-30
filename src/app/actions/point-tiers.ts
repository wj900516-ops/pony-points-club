"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { requireStaff, AuthError, ForbiddenError } from "@/lib/permissions";
import { pointTierIdSchema, pointTierSchema } from "@/lib/validations";

export type TierMutationResult = { ok: boolean; error?: string };

function denyMessage(e: unknown): TierMutationResult | null {
  if (e instanceof AuthError) return { ok: false, error: "请先登录" };
  if (e instanceof ForbiddenError) return { ok: false, error: "无权操作" };
  return null;
}

function decimalString(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export async function createPointTierAction(
  formData: FormData
): Promise<TierMutationResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    const denied = denyMessage(e);
    if (denied) return denied;
    return { ok: false, error: "权限校验失败" };
  }

  try {
    const parsed = pointTierSchema.safeParse({
      label: formData.get("label"),
      priceAmount: decimalString(formData.get("priceAmount")),
      points: decimalString(formData.get("points")),
      sortOrder: formData.get("sortOrder") ?? 0,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? "参数有误" };
    }

    await prisma.$transaction(async (tx) => {
      const tier = await tx.pointTier.create({
        data: {
          label: parsed.data.label,
          priceAmount: new Prisma.Decimal(parsed.data.priceAmount),
          points: new Prisma.Decimal(parsed.data.points),
          sortOrder: parsed.data.sortOrder,
          isActive: true,
          createdById: staff.id,
          updatedById: staff.id,
        },
      });
      await writeAudit(tx, {
        action: "POINT_TIER_CREATE",
        entityType: "PointTier",
        entityId: tier.id,
        operatorId: staff.id,
        detail: {
          label: tier.label,
          priceAmount: tier.priceAmount.toString(),
          points: tier.points.toString(),
          sortOrder: tier.sortOrder,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/points");
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, error: "添加积分档位失败，请稍后重试" };
  }
}

export async function updatePointTierAction(
  formData: FormData
): Promise<TierMutationResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    const denied = denyMessage(e);
    if (denied) return denied;
    return { ok: false, error: "权限校验失败" };
  }

  try {
    const idParsed = pointTierIdSchema.safeParse({ id: formData.get("id") });
    if (!idParsed.success) return { ok: false, error: "参数有误" };

    const parsed = pointTierSchema.safeParse({
      label: formData.get("label"),
      priceAmount: decimalString(formData.get("priceAmount")),
      points: decimalString(formData.get("points")),
      sortOrder: formData.get("sortOrder") ?? 0,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? "参数有误" };
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.pointTier.findUnique({ where: { id: idParsed.data.id } });
      if (!existing) throw new Error("NOT_FOUND");

      const tier = await tx.pointTier.update({
        where: { id: existing.id },
        data: {
          label: parsed.data.label,
          priceAmount: new Prisma.Decimal(parsed.data.priceAmount),
          points: new Prisma.Decimal(parsed.data.points),
          sortOrder: parsed.data.sortOrder,
          updatedById: staff.id,
        },
      });
      await writeAudit(tx, {
        action: "POINT_TIER_UPDATE",
        entityType: "PointTier",
        entityId: tier.id,
        operatorId: staff.id,
        detail: {
          oldLabel: existing.label,
          label: tier.label,
          priceAmount: tier.priceAmount.toString(),
          points: tier.points.toString(),
          sortOrder: tier.sortOrder,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/points");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return { ok: false, error: "积分档位不存在" };
    }
    return { ok: false, error: "修改积分档位失败，请稍后重试" };
  }
}

export async function togglePointTierActiveAction(
  formData: FormData
): Promise<TierMutationResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    const denied = denyMessage(e);
    if (denied) return denied;
    return { ok: false, error: "权限校验失败" };
  }

  try {
    const parsed = pointTierIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return { ok: false, error: "参数有误" };

    await prisma.$transaction(async (tx) => {
      const existing = await tx.pointTier.findUnique({ where: { id: parsed.data.id } });
      if (!existing) throw new Error("NOT_FOUND");

      const tier = await tx.pointTier.update({
        where: { id: existing.id },
        data: {
          isActive: !existing.isActive,
          updatedById: staff.id,
        },
      });
      await writeAudit(tx, {
        action: tier.isActive ? "POINT_TIER_RESTORE" : "POINT_TIER_DISABLE",
        entityType: "PointTier",
        entityId: tier.id,
        operatorId: staff.id,
        detail: {
          label: tier.label,
          priceAmount: tier.priceAmount.toString(),
          points: tier.points.toString(),
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/points");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return { ok: false, error: "积分档位不存在" };
    }
    return { ok: false, error: "更新积分档位状态失败，请稍后重试" };
  }
}
