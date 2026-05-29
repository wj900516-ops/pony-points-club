import "server-only";

import { randomBytes } from "crypto";

export const REWARD_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const REWARD_UPLOAD_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type RewardUploadMime = (typeof REWARD_UPLOAD_ALLOWED_MIMES)[number];

const MIME_TO_EXT: Record<RewardUploadMime, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function isAllowedRewardUploadMime(
  mime: string
): mime is RewardUploadMime {
  return (REWARD_UPLOAD_ALLOWED_MIMES as readonly string[]).includes(mime);
}

export function getRewardUploadExtension(mime: RewardUploadMime): string {
  return MIME_TO_EXT[mime];
}

/** 校验文件头与声明 MIME 一致，防止伪装扩展名 */
export function validateRewardUploadMagic(
  buffer: Buffer,
  mime: RewardUploadMime
): boolean {
  if (buffer.length < 12) return false;
  switch (mime) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/gif":
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );
    case "image/webp":
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );
    default:
      return false;
  }
}

/** 生成安全文件名：reward-{timestamp}-{random}.{ext} */
export function buildRewardUploadFilename(mime: RewardUploadMime): string {
  const ext = getRewardUploadExtension(mime);
  const random = randomBytes(8).toString("hex");
  return `reward-${Date.now()}-${random}${ext}`;
}
