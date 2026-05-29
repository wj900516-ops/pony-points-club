import "server-only";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validations";
import type { Role } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string; status: number };

export async function registerUser(input: {
  email: unknown;
  password: unknown;
  displayName: unknown;
}): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "输入有误",
      status: 400,
    };
  }

  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "该邮箱已注册，请直接登录", status: 409 };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      role: "VIEWER",
    },
    select: { id: true, email: true, displayName: true, role: true },
  });

  await createSession({ uid: user.id, email: user.email, role: user.role });
  return { ok: true, user };
}

export async function loginUser(input: {
  email: unknown;
  password: unknown;
}): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "输入有误",
      status: 400,
    };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "邮箱或密码错误", status: 401 };
  }

  await createSession({ uid: user.id, email: user.email, role: user.role });
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  };
}
