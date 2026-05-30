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
  bossArchiveSchema,
  bossBindSchema,
  bossCreateSchema,
  bossRenameSchema,
  bossRestoreSchema,
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
  revalidatePath("/my-points");
  revalidatePath("/admin");
}

export async function createBossAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const parsed = bossCreateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "请填写老板名字" };
  }
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);

  await prisma.$transaction(async (tx) => {
    const boss = await tx.boss.create({
      data: {
        name: parsed.data.name,
        totalPoints: 0,
        isActive: true,
        deletedAt: null,
        userId: null,
      },
    });
    await writeAudit(tx, {
      action: "BOSS_CREATE",
      entityType: "Boss",
      entityId: boss.id,
      operatorId: r.staff.id,
      detail: { bossName: boss.name, note },
    });
  });

  revalidate();
  return { ok: true };
}

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
  if (boss.deletedAt) return { ok: false, error: "该老板已删除，不能改名" };
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
  if (boss.deletedAt) return { ok: false, error: "该老板已删除，不能归档" };
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

export async function restoreBossAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const parsed = bossRestoreSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "参数有误" };

  const boss = await prisma.boss.findUnique({ where: { id: parsed.data.id } });
  if (!boss) return { ok: false, error: "老板不存在" };
  if (boss.isActive && !boss.deletedAt) return { ok: false, error: "该老板未归档或删除" };

  await prisma.$transaction(async (tx) => {
    await tx.boss.update({
      where: { id: boss.id },
      data: {
        isActive: true,
        archivedAt: null,
        archivedById: null,
        archiveReason: null,
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
      },
    });
    await writeAudit(tx, {
      action: "BOSS_RESTORE",
      entityType: "Boss",
      entityId: boss.id,
      operatorId: r.staff.id,
      detail: { bossName: boss.name },
    });
  });

  revalidate();
  return { ok: true };
}

export async function deleteBossAction(
  formData: FormData
): Promise<MutationResult> {
  const r = await requireStaffOrDeny();
  if ("denied" in r) return r.denied;

  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { ok: false, error: "参数有误" };
  if (!reason) return { ok: false, error: "请填写删除原因" };
  if (reason.length > 200) return { ok: false, error: "原因过长" };

  const boss = await prisma.boss.findUnique({ where: { id } });
  if (!boss) return { ok: false, error: "老板不存在" };
  if (boss.deletedAt) return { ok: false, error: "该老板已删除，不能重复删除" };

  await prisma.$transaction(async (tx) => {
    await tx.boss.update({
      where: { id: boss.id },
      data: {
        deletedAt: new Date(),
        deletedById: r.staff.id,
        deleteReason: reason,
      },
    });
    await writeAudit(tx, {
      action: "BOSS_DELETE",
      entityType: "Boss",
      entityId: boss.id,
      operatorId: r.staff.id,
      detail: { bossName: boss.name, deleteReason: reason },
    });
  });

  revalidate();
  return { ok: true };
}

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
  if (boss.deletedAt) return { ok: false, error: "该老板已删除，不能绑定账号" };
  if (!user) return { ok: false, error: "用户不存在" };
  if (boss.userId && boss.userId !== user.id) {
    return { ok: false, error: "该老板已绑定其他账号，请先解绑" };
  }

  const existing = await prisma.boss.findUnique({ where: { userId: user.id } });
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
