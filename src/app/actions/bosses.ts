"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, AuthError, ForbiddenError } from "@/lib/permissions";
import { bossCreateSchema, bossUpdateSchema } from "@/lib/validations";
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

export async function createBossAction(
  formData: FormData
): Promise<MutationResult> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = bossCreateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "输入有误" };
  }

  await prisma.boss.create({ data: { name: parsed.data.name } });
  revalidatePath("/points");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateBossAction(
  formData: FormData
): Promise<MutationResult> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = bossUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "输入有误" };
  }

  await prisma.boss.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name },
  });
  revalidatePath("/points");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setBossActiveAction(
  formData: FormData
): Promise<MutationResult> {
  const denied = await guard();
  if (denied) return denied;

  const id = formData.get("id");
  const isActiveRaw = formData.get("isActive");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "参数有误" };
  }
  if (isActiveRaw !== "true" && isActiveRaw !== "false") {
    return { ok: false, error: "参数有误" };
  }

  const boss = await prisma.boss.findUnique({ where: { id } });
  if (!boss) return { ok: false, error: "老板不存在" };

  await prisma.boss.update({
    where: { id },
    data: { isActive: isActiveRaw === "true" },
  });
  revalidatePath("/points");
  revalidatePath("/admin");
  return { ok: true };
}
