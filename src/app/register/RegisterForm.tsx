"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerAction, type ActionState } from "@/app/actions/auth";

export default function RegisterForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    registerAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      router.replace("/my-points");
    }
  }, [state?.success, router]);

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
      <button
        type="submit"
        className="pony-btn-primary w-full"
        disabled={isPending}
      >
        {isPending ? "注册中…" : "注册"}
      </button>
    </form>
  );
}
