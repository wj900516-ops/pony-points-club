"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireStaff,
  type SessionUser,
  AuthError,
  ForbiddenError,
} from "@/lib/permissions";
import {
  bossCreateSchema,
  bossRenameSchema,
  bossArchiveSchema,
  bossRestoreSchema,
  bossBindSchema,
  bossUnbindSchema,
} from "@/lib/validations";
import { writeAudit } from "@/lib/audit";
import type { MutationResult } from "@/app/actions/points";

async function requireStaffOrDeny(): Promise<
  { staff: SessionUser } | { denied: MutationResult }
> {
  try {
    return { staff: await requireStaff() };
  } catch (e) {
    if (e instanceof AuthError) return { denied: { ok: false, error: "请先登录" } };
    if (e instanceof ForbiddenError)
      return { denied: { ok: false, error: "无权操作" } };
    throw e;
  }
}

function revalidate() {
  revalidatePath("/points");
  revalidatePath("/admin");
}

export async function createBossAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const parsed = bossCreateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "输入有误" };
  }

  await prisma.boss.create({ data: { name: parsed.data.name } });
  revalidate();
  return { ok: true };
}

// 改名 + 审计日志（BOSS_RENAME）
export async function updateBossAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const parsed = bossRenameSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "输入有误" };
  }

  const boss = await prisma.boss.findUnique({ where: { id: parsed.data.id } });
  if (!boss) return { ok: false, error: "老板不存在" };
  if (boss.name === parsed.data.name) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.boss.update({
      where: { id: boss.id },
      data: { name: parsed.data.name },
    });
    await writeAudit(tx, {
      action: "BOSS_RENAME",
      entityType: "Boss",
      entityId: boss.id,
      operatorId: r.staff.id,
      detail: { oldName: boss.name, newName: parsed.data.name },
    });
  });

  revalidate();
  return { ok: true };
}

// 归档老板（要求填原因）+ 审计
export async function archiveBossAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const parsed = bossArchiveSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "请填写归档原因" };
  }

  const boss = await prisma.boss.findUnique({ where: { id: parsed.data.id } });
  if (!boss) return { ok: false, error: "老板不存在" };
  if (!boss.isActive) return { ok: false, error: "该老板已归档" };

  await prisma.$transaction(async (tx) => {
    await tx.boss.update({
      where: { id: boss.id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: r.staff.id,
        archiveReason: parsed.data.reason,
      },
    });
    await writeAudit(tx, {
      action: "BOSS_ARCHIVE",
      entityType: "Boss",
      entityId: boss.id,
      operatorId: r.staff.id,
      detail: { reason: parsed.data.reason, name: boss.name },
    });
  });

  revalidate();
  return { ok: true };
}

// 恢复显示 + 审计（记录操作人/时间）
export async function restoreBossAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const parsed = bossRestoreSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "参数有误" };

  const boss = await prisma.boss.findUnique({ where: { id: parsed.data.id } });
  if (!boss) return { ok: false, error: "老板不存在" };
  if (boss.isActive) return { ok: false, error: "该老板未归档" };

  await prisma.$transaction(async (tx) => {
    await tx.boss.update({
      where: { id: boss.id },
      data: {
        isActive: true,
        archivedAt: null,
        archivedById: null,
        archiveReason: null,
      },
    });
    await writeAudit(tx, {
      action: "BOSS_RESTORE",
      entityType: "Boss",
      entityId: boss.id,
      operatorId: r.staff.id,
      detail: { name: boss.name },
    });
  });

  revalidate();
  return { ok: true };
}

// 绑定用户账号到老板积分档案
export async function bindBossUserAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const parsed = bossBindSchema.safeParse({
    bossId: formData.get("bossId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { ok: false, error: "参数有误" };

  const [boss, user] = await Promise.all([
    prisma.boss.findUnique({ where: { id: parsed.data.bossId } }),
    prisma.user.findUnique({ where: { id: parsed.data.userId } }),
  ]);
  if (!boss) return { ok: false, error: "老板不存在" };
  if (!user) return { ok: false, error: "用户不存在" };
  if (boss.userId && boss.userId !== user.id) {
    return { ok: false, error: "该老板已绑定其他账号，请先解绑" };
  }

  // 该用户是否已绑定其他老板
  const existing = await prisma.boss.findUnique({
    where: { userId: user.id },
  });
  if (existing && existing.id !== boss.id) {
    return { ok: false, error: "该用户已绑定其他老板" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.boss.update({
        where: { id: boss.id },
        data: { userId: user.id },
      });
      await writeAudit(tx, {
        action: "BOSS_BIND_USER",
        entityType: "Boss",
        entityId: boss.id,
        operatorId: r.staff.id,
        detail: { email: user.email, bossName: boss.name },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "该用户已绑定其他老板" };
    }
    throw e;
  }

  revalidate();
  return { ok: true };
}

// 解绑
export async function unbindBossUserAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const parsed = bossUnbindSchema.safeParse({ bossId: formData.get("bossId") });
  if (!parsed.success) return { ok: false, error: "参数有误" };

  const boss = await prisma.boss.findUnique({
    where: { id: parsed.data.bossId },
    include: { user: { select: { email: true } } },
  });
  if (!boss) return { ok: false, error: "老板不存在" };
  if (!boss.userId) return { ok: false, error: "该老板未绑定账号" };

  await prisma.$transaction(async (tx) => {
    await tx.boss.update({
      where: { id: boss.id },
      data: { userId: null },
    });
    await writeAudit(tx, {
      action: "BOSS_UNBIND_USER",
      entityType: "Boss",
      entityId: boss.id,
      operatorId: r.staff.id,
      detail: { email: boss.user?.email ?? null, bossName: boss.name },
    });
  });

  revalidate();
  return { ok: true };
}
