"use client";

import { useRef, useState } from "react";
import { resolveRewardImageForDisplay } from "@/lib/reward-image-url";

export default function RewardImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSrc = value.trim()
    ? resolveRewardImageForDisplay(value)
    : resolveRewardImageForDisplay(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/uploads/rewards", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "上传失败，请重试");
      }
      if (!data.url) {
        throw new Error("上传失败，未返回图片地址");
      }
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败，请重试");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-pony-purple/20 bg-pony-gradient-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt="商品图片预览"
          className="aspect-[4/3] w-full max-h-48 object-cover sm:max-h-56"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          ref={inputRef}
          id="reward-image-file"
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={handleFileChange}
        />
        <label
          htmlFor="reward-image-file"
          className={`pony-btn-primary w-full cursor-pointer sm:w-auto ${
            uploading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {uploading ? "上传中…" : "上传图片"}
        </label>
        {value.trim() && (
          <button
            type="button"
            className="pony-btn-ghost w-full sm:w-auto"
            disabled={uploading}
            onClick={() => onChange("")}
          >
            清除图片
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        支持手机相册 / iPad / 电脑选择，JPEG·PNG·WebP·GIF，最大 5MB。生产（Vercel）上传至
        Supabase Storage；本地开发可存 /uploads/rewards。
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
