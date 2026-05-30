"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";
import { loginUser, registerUser } from "@/lib/auth-credentials";

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await registerUser({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!result.ok) return { error: result.error };
  // 不在此处 redirect：redirect() 会抛 NEXT_REDIRECT，导致客户端 pending 无法结束
  return { success: true };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await loginUser({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!result.ok) return { error: result.error };
  redirect("/points");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/points");
}
