"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff, AuthError, ForbiddenError } from "@/lib/permissions";
import { rewardSchema } from "@/lib/validations";
import { validateRewardImageUrl } from "@/lib/reward-image-url";
import type { MutationResult } from "@/app/actions/points";

async function guard(): Promise<MutationResult | null> {
  try {
    await requireStaff();
    return null;
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "请先登录" };
    if (e instanceof ForbiddenError) return { ok: false, error: "无权操作" };
    throw e;
  }
}

function parseForm(formData: FormData) {
  return rewardSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    pointsRequired: formData.get("pointsRequired"),
    stock: formData.get("stock"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

/** 服务端兜底：已存 imageUrl 非法时不允许上下架等变更 */
function rejectIfStoredImageInvalid(
  imageUrl: string | null
): MutationResult | null {
  if (!imageUrl?.trim()) return null;
  const check = validateRewardImageUrl(imageUrl);
  if (!check.ok) {
    return {
      ok: false,
      error: "商品图片地址不合法，请先修正图片地址后再操作",
    };
  }
  return null;
}

export async function createRewardAction(
  formData: FormData
): Promise<MutationResult> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "输入有误" };
  }
  const d = parsed.data;

  await prisma.rewardItem.create({
    data: {
      name: d.name,
      description: d.description || null,
      imageUrl: d.imageUrl || null,
      pointsRequired: new Prisma.Decimal(d.pointsRequired),
      stock: d.stock,
      isActive: d.isActive ?? true,
    },
  });
  revalidatePath("/rewards");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateRewardAction(
  formData: FormData
): Promise<MutationResult> {
  const denied = await guard();
  if (denied) return denied;

  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "缺少商品 ID" };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "输入有误" };
  }
  const d = parsed.data;

  await prisma.rewardItem.update({
    where: { id },
    data: {
      name: d.name,
      description: d.description || null,
      imageUrl: d.imageUrl || null,
      pointsRequired: new Prisma.Decimal(d.pointsRequired),
      stock: d.stock,
      isActive: d.isActive ?? true,
    },
  });
  revalidatePath("/rewards");
  revalidatePath("/admin");
  return { ok: true };
}

/** 仅切换 isActive，不读取或写入 imageUrl */
export async function toggleRewardActiveAction(
  formData: FormData
): Promise<MutationResult> {
  const denied = await guard();
  if (denied) return denied;

  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "缺少商品 ID" };

  const item = await prisma.rewardItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "商品不存在" };

  const imageDenied = rejectIfStoredImageInvalid(item.imageUrl);
  if (imageDenied) return imageDenied;

  await prisma.rewardItem.update({
    where: { id },
    data: { isActive: !item.isActive },
  });
  revalidatePath("/rewards");
  revalidatePath("/admin");
  return { ok: true };
}

/** @deprecated 使用 toggleRewardActiveAction */
export const toggleRewardAction = toggleRewardActiveAction;
