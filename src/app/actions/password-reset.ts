"use server";

import { redirect } from "next/navigation";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/password-reset";

export type PasswordResetActionState =
  | { error?: string; success?: boolean; message?: string }
  | undefined;

export async function forgotPasswordAction(
  _prev: PasswordResetActionState,
  formData: FormData
): Promise<PasswordResetActionState> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        error: "密码重置功能暂未开放，请联系管理员重置密码。",
      };
    }
    const result = await requestPasswordReset(formData.get("email"));
    if (!result.ok) return { error: result.error };
    return { success: true, message: result.message };
  } catch {
    return { error: "无法发送重置密码邮件，请稍后重试" };
  }
}

export async function resetPasswordAction(
  _prev: PasswordResetActionState,
  formData: FormData
): Promise<PasswordResetActionState> {
  try {
    const result = await resetPasswordWithToken({
      token: formData.get("token"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!result.ok) return { error: result.error };
  } catch {
    return { error: "无法重置密码，请稍后重试" };
  }

  redirect("/login?reset=1");
}
