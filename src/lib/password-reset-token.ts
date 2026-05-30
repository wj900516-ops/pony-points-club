import { createHash, randomBytes } from "crypto";

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_PUBLIC_MESSAGE =
  "如果该邮箱存在，我们会发送重置密码链接。";

export type PasswordResetTokenState = {
  expiresAt: Date;
  usedAt: Date | null;
};

export function generatePasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpiry(now = new Date()): Date {
  return new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
}

export function isPasswordResetTokenExpired(
  expiresAt: Date,
  now = new Date()
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function canUsePasswordResetToken(
  state: PasswordResetTokenState,
  now = new Date()
): boolean {
  if (state.usedAt) return false;
  return !isPasswordResetTokenExpired(state.expiresAt, now);
}
