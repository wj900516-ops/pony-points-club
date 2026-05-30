"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  resetPasswordAction,
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
      {pending ? "更新中..." : "更新密码"}
    </button>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<
    PasswordResetActionState,
    FormData
  >(resetPasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="pony-label" htmlFor="password">
          新密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="pony-input text-base"
          placeholder="至少 8 位"
        />
      </div>
      <div>
        <label className="pony-label" htmlFor="confirmPassword">
          确认新密码
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="pony-input text-base"
          placeholder="再次输入新密码"
        />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
