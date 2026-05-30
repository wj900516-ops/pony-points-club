"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireOwner,
  requireStaff,
  AuthError,
  ForbiddenError,
} from "@/lib/permissions";
import { roleUpdateSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";
import type { MutationResult } from "@/app/actions/points";

// 修改用户角色：仅 owner。只能在 ADMIN / VIEWER 之间切换，
// 不能把任何人改成 OWNER（owner 只能由数据库手动设置，避免越权）。
export async function updateUserRoleAction(
  formData: FormData
): Promise<MutationResult> {
  let owner;
  try {
    owner = await requireOwner();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "请先登录" };
    if (e instanceof ForbiddenError)
      return { ok: false, error: "仅主理人可修改角色" };
    throw e;
  }

  const parsed = roleUpdateSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: "参数有误" };
  }

  const { userId, role } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "用户不存在" };

  // 不能修改其它 owner，也不能修改自己（owner 不能把自己降级）
  if (target.role === "OWNER") {
    return { ok: false, error: "不能修改主理人(owner)的角色" };
  }
  if (target.id === owner.id) {
    return { ok: false, error: "不能修改自己的角色" };
  }
  if (target.role === role) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role } });
    await writeAudit(tx, {
      action: role === "ADMIN" ? "ROLE_PROMOTE" : "ROLE_DEMOTE",
      entityType: "User",
      entityId: userId,
      operatorId: owner.id,
      detail: { email: target.email, from: target.role, to: role },
    });
  });

  revalidatePath("/admin");
  return { ok: true };
}

export interface BindableUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  boundBossName: string | null; // 已绑定的老板名（若有）
}

// 供 owner/admin 在绑定 UI 中搜索用户（按邮箱/昵称）。
export async function fetchBindableUsers(
  query: string
): Promise<BindableUser[]> {
  try {
    await requireStaff();
  } catch {
    return [];
  }

  const q = query.trim();
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      boss: { select: { name: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    boundBossName: u.boss?.name ?? null,
  }));
}

export interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  operator: string;
  summary: string;
}

const ACTION_LABEL: Record<string, string> = {
  BOSS_CREATE: "添加老板",
  BOSS_DELETE: "删除老板",
  BOSS_RESTORE: "恢复老板",
  BOSS_RENAME: "修改老板名字",
  BOSS_ARCHIVE: "归档老板",
  BOSS_UNARCHIVE: "恢复显示",
  BOSS_BIND_USER: "绑定账号",
  BOSS_UNBIND_USER: "解绑账号",
  USER_ROLE_UPDATE: "修改用户权限",
  ROLE_PROMOTE: "修改用户权限",
  ROLE_DEMOTE: "修改用户权限",
  REWARD_CREATE: "添加商品",
  REWARD_UPDATE: "修改商品",
  REWARD_DELETE: "下架商品",
  REWARD_ARCHIVE: "下架商品",
  REWARD_RESTORE: "恢复商品",
  REDEMPTION_CREATE: "后台兑换",
  REDEEM: "后台兑换",
  POINT_ADJUST: "调整积分",
  POINT_MANUAL_ADD: "调整积分",
  POINT_MANUAL_DEDUCT: "调整积分",
  POINT_VOID: "撤销积分",
  POINT_TIER_CREATE: "添加积分档位",
  POINT_TIER_UPDATE: "修改积分档位",
  POINT_TIER_DISABLE: "停用积分档位",
  POINT_TIER_RESTORE: "恢复积分档位",
};
function summarize(action: string, detail: unknown): string {
  const d = (detail ?? {}) as Record<string, unknown>;
  switch (action) {
    case "BOSS_RENAME":
      return `${d.oldName ?? ""} → ${d.newName ?? ""}`;
    case "BOSS_ARCHIVE":
      return `${d.name ?? ""}（原因：${d.reason ?? ""}）`;
    case "BOSS_RESTORE":
      return `${d.name ?? ""}`;
    case "BOSS_BIND_USER":
      return `${d.bossName ?? ""} ← ${d.email ?? ""}`;
    case "BOSS_UNBIND_USER":
      return `${d.bossName ?? ""} ✕ ${d.email ?? ""}`;
    case "ROLE_PROMOTE":
    case "ROLE_DEMOTE":
      return `${d.email ?? ""}`;
    case "POINT_MANUAL_ADD":
    case "POINT_MANUAL_DEDUCT":
      return `${d.amount ?? ""}分（${d.reason ?? ""}）`;
    case "POINT_VOID":
      return `${d.reason ?? ""}`;
    case "REDEEM":
      return `${d.rewardName ?? ""} ×${d.quantity ?? 1}（-${d.pointsSpent ?? ""}分）`;
    case "POINT_TIER_CREATE":
    case "POINT_TIER_UPDATE":
    case "POINT_TIER_DISABLE":
    case "POINT_TIER_RESTORE":
      return `${d.label ?? ""} ${d.priceAmount ?? ""} / +${d.points ?? ""}分`;
    default:
      return "";
  }
}

// 最近操作记录（后台展示）。owner/admin 可读。
export async function fetchAuditLogs(): Promise<AuditRow[]> {
  try {
    await requireStaff();
  } catch {
    return [];
  }

  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { operator: { select: { displayName: true, email: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    action: ACTION_LABEL[r.action] ?? r.action,
    operator: r.operator?.displayName || r.operator?.email || "未知",
    summary: summarize(r.action, r.detail),
  }));
}
