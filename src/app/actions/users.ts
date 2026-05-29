"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOwner, AuthError, ForbiddenError } from "@/lib/permissions";
import { roleUpdateSchema } from "@/lib/validations";
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

  // 不能修改其它 owner，也不能修改自己
  if (target.role === "OWNER") {
    return { ok: false, error: "不能修改主理人(owner)的角色" };
  }
  if (target.id === owner.id) {
    return { ok: false, error: "不能修改自己的角色" };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
  return { ok: true };
}
