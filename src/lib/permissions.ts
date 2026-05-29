import "server-only";
import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
};

export class AuthError extends Error {
  constructor(message = "未登录或会话已失效") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "没有权限执行该操作") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function isStaff(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function isOwner(role: Role): boolean {
  return role === "OWNER";
}

// 要求已登录，否则抛错
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

// 要求 owner 或 admin（可操作积分/商品/老板）
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaff(user.role)) throw new ForbiddenError();
  return user;
}

// 要求 owner（可修改用户角色）
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isOwner(user.role)) throw new ForbiddenError("仅主理人(owner)可执行该操作");
  return user;
}
