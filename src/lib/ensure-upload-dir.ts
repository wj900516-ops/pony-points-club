import "server-only";

import { mkdir } from "fs/promises";
import path from "path";

const REWARD_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "rewards"
);

/** 确保本地上传目录存在（启动时与上传前均可调用） */
export async function ensureRewardUploadDir(): Promise<string> {
  await mkdir(REWARD_UPLOAD_DIR, { recursive: true });
  return REWARD_UPLOAD_DIR;
}

export function getRewardUploadDir(): string {
  return REWARD_UPLOAD_DIR;
}
