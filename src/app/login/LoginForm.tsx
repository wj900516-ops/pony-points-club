"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type ActionState } from "@/app/actions/auth";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pony-btn-primary w-full" disabled={pending}>
      {pending ? "登录中…" : "登录"}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    loginAction,
    undefined
  );

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
          className="pony-input"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="pony-label" htmlFor="password">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="pony-input"
          placeholder="••••••••"
        />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}
