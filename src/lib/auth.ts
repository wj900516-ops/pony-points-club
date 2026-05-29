import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthSecretBytes } from "@/lib/auth-secret";

const COOKIE_NAME = "pony_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 天

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export interface SessionPayload {
  uid: string;
  email: string;
  role: Role;
}

// 签发 JWT 并写入 httpOnly cookie（登录/注册成功后调用）
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getAuthSecretBytes());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, cookieOptions(MAX_AGE_SECONDS));
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  // 与 createSession 相同 path/secure/sameSite，确保 HTTPS 下能正确清除
  cookieStore.set(COOKIE_NAME, "", cookieOptions(0));
}

// 读取并校验会话（仅解 token，不查库）
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretBytes());
    return {
      uid: String(payload.uid),
      email: String(payload.email),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

// 取当前登录用户（查库，拿到最新 role/displayName）
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  });
  return user;
}
