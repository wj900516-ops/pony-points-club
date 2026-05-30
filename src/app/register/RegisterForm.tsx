"use client";

import { useState, type FormEvent } from "react";
import { registerAction } from "@/app/actions/auth";

export default function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "submitting" | "redirecting">(
    "idle"
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "idle") return;

    setError(null);
    setPhase("submitting");

    const fd = new FormData(e.currentTarget);
    try {
      const result = await registerAction(undefined, fd);
      if (result?.error) {
        setError(result.error);
        setPhase("idle");
        return;
      }
      if (result?.success) {
        setPhase("redirecting");
        // 硬跳转：避免 RSC redirect 与 useActionState 竞态导致 /register 空壳
        window.location.assign("/my-points");
        return;
      }
      setError("注册失败，请稍后重试");
      setPhase("idle");
    } catch {
      setError("网络异常，请稍后重试");
      setPhase("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          disabled={phase !== "idle"}
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
          disabled={phase !== "idle"}
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
          disabled={phase !== "idle"}
        />
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {phase === "redirecting" && (
        <p className="rounded-lg bg-pony-purple/10 px-3 py-2 text-sm text-pony-purpleDeep">
          注册成功，正在进入我的积分…
        </p>
      )}
      <button
        type="submit"
        className="pony-btn-primary w-full"
        disabled={phase !== "idle"}
      >
        {phase === "submitting"
          ? "注册中…"
          : phase === "redirecting"
            ? "跳转中…"
            : "注册"}
      </button>
    </form>
  );
}
