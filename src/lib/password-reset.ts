import "server-only";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { passwordSchema } from "@/lib/validations";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  PASSWORD_RESET_PUBLIC_MESSAGE,
  canUsePasswordResetToken,
  generatePasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
} from "@/lib/password-reset-token";

export type PasswordResetResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export async function requestPasswordReset(
  emailRaw: unknown
): Promise<PasswordResetResult> {
  try {
    const email = String(emailRaw ?? "").trim().toLowerCase();
    if (!email) return { ok: true, message: PASSWORD_RESET_PUBLIC_MESSAGE };

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return { ok: true, message: PASSWORD_RESET_PUBLIC_MESSAGE };
    }

    const token = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = getPasswordResetExpiry();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetLink = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(
      token
    )}`;
    const sent = await sendPasswordResetEmail({ to: user.email, resetLink });
    if (!sent.ok) return sent;

    return { ok: true, message: PASSWORD_RESET_PUBLIC_MESSAGE };
  } catch {
    return { ok: false, error: "无法发送重置密码邮件，请稍后重试" };
  }
}

export async function resetPasswordWithToken(input: {
  token: unknown;
  password: unknown;
  confirmPassword: unknown;
}): Promise<PasswordResetResult> {
  try {
    const token = String(input.token ?? "").trim();
    if (!token) return { ok: false, error: "重置链接无效或已过期" };

    const passwordCheck = passwordSchema.safeParse(input.password);
    if (!passwordCheck.success) {
      return {
        ok: false,
        error: passwordCheck.error.errors[0]?.message ?? "新密码不符合要求",
      };
    }

    const confirmPassword = String(input.confirmPassword ?? "");
    if (passwordCheck.data !== confirmPassword) {
      return { ok: false, error: "两次输入的新密码不一致" };
    }

    const tokenHash = hashPasswordResetToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!resetToken || !canUsePasswordResetToken(resetToken)) {
      return { ok: false, error: "重置链接无效、已过期或已使用" };
    }

    const passwordHash = await hashPassword(passwordCheck.data);
    const usedAt = new Date();

    await prisma.$transaction(async (tx) => {
      const marked = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: usedAt },
        },
        data: { usedAt },
      });

      if (marked.count !== 1) {
        throw new Error("TOKEN_ALREADY_USED");
      }

      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") {
      return { ok: false, error: "重置链接无效、已过期或已使用" };
    }
    return { ok: false, error: "无法重置密码，请稍后重试" };
  }
}

export async function validatePasswordResetTokenForDisplay(
  tokenRaw: unknown
): Promise<PasswordResetResult> {
  try {
    const token = String(tokenRaw ?? "").trim();
    if (!token) return { ok: false, error: "重置链接无效或已过期" };

    const tokenHash = hashPasswordResetToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { expiresAt: true, usedAt: true },
    });

    if (!resetToken || !canUsePasswordResetToken(resetToken)) {
      return { ok: false, error: "重置链接无效、已过期或已使用" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "无法验证重置链接，请稍后重试" };
  }
}
