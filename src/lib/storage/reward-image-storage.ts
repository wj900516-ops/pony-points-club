import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStorageDriver, getSupabaseStorageBucket } from "@/lib/storage-driver";
import { ensureRewardUploadDir } from "@/lib/ensure-upload-dir";
import type { RewardUploadMime } from "@/lib/reward-upload";

export class RewardImageStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RewardImageStorageError";
  }
}

async function uploadToLocal(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const uploadDir = path.resolve(await ensureRewardUploadDir());
  const filePath = path.resolve(uploadDir, filename);

  if (!filePath.startsWith(`${uploadDir}${path.sep}`)) {
    throw new RewardImageStorageError("非法文件路径");
  }

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, buffer);
  return `/uploads/rewards/${filename}`;
}

async function uploadToSupabase(
  buffer: Buffer,
  mime: RewardUploadMime,
  filename: string
): Promise<string> {
  const bucket = getSupabaseStorageBucket();
  const supabase = getSupabaseAdmin();
  const objectPath = filename;

  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    throw new RewardImageStorageError(
      error.message.includes("Bucket not found")
        ? `Storage bucket「${bucket}」不存在，请在 Supabase 控制台创建并设为 Public`
        : `上传失败：${error.message}`
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  if (!data.publicUrl) {
    throw new RewardImageStorageError("无法生成图片公开 URL");
  }
  return data.publicUrl;
}

/** 保存商品图片；Vercel 生产走 Supabase Storage，本地可走 public/uploads */
export async function saveRewardImage(
  buffer: Buffer,
  mime: RewardUploadMime,
  filename: string
): Promise<string> {
  const driver = getStorageDriver();

  if (driver === "supabase") {
    return uploadToSupabase(buffer, mime, filename);
  }

  if (process.env.VERCEL === "1") {
    throw new RewardImageStorageError(
      "Vercel 环境不能写入本地目录，请设置 STORAGE_DRIVER=supabase 并配置 Supabase Storage"
    );
  }

  return uploadToLocal(buffer, filename);
}
