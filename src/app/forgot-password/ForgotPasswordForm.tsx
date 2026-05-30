"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  forgotPasswordAction,
  type PasswordResetActionState,
} from "@/app/actions/password-reset";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="pony-btn-primary min-h-[44px] w-full"
      disabled={pending}
    >
      {pending ? "发送中..." : "发送重置链接"}
    </button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState<
    PasswordResetActionState,
    FormData
  >(forgotPasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="pony-label" htmlFor="email">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="pony-input text-base"
          placeholder="you@example.com"
        />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.message || "如果该邮箱存在，我们会发送重置密码链接。"}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
