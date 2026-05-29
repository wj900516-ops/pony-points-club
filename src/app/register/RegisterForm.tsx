"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction, type ActionState } from "@/app/actions/auth";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pony-btn-primary w-full" disabled={pending}>
      {pending ? "注册中…" : "注册"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    registerAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="pony-label" htmlFor="displayName">
          昵称
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          maxLength={40}
          className="pony-input"
          placeholder="你的昵称"
        />
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
          className="pony-input"
          placeholder="至少 8 位"
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
