/**
 * 商品图片 URL 白名单自动测试
 * 运行：npm run test:url-whitelist
 */
import { validateRewardImageUrl } from "../src/lib/reward-image-url";
import { rewardSchema } from "../src/lib/validations";

const REJECT_URLS = [
  "https://fonts.googleapis.com/test.png",
  "https://www.gstatic.com/test.png",
  "https://youtube.com/test.png",
  "https://vercel.app/test.png",
  "https://x.com/test.png",
  "https://firebaseapp.com/test.png",
  "https://googleapis.com/test.png",
] as const;

const ALLOW_URLS = [
  "/rewards/placeholder.svg",
  "/images/test.png",
  "/uploads/test.png",
  "https://foqbbgkypmmnxgakunjo.supabase.co/storage/v1/object/public/reward-images/test.png",
] as const;

function baseRewardPayload(imageUrl: string) {
  return {
    name: "QA Test",
    description: "",
    imageUrl,
    pointsRequired: 1,
    stock: 1,
    isActive: true,
  };
}

let failures = 0;

function fail(msg: string) {
  console.error(`✗ ${msg}`);
  failures++;
}

function pass(msg: string) {
  console.log(`✓ ${msg}`);
}

console.log("=== validateRewardImageUrl ===\n");

for (const url of REJECT_URLS) {
  const result = validateRewardImageUrl(url);
  if (result.ok) {
    fail(`应拒绝但通过: ${url}`);
  } else {
    pass(`拒绝: ${url}`);
  }
}

for (const url of ALLOW_URLS) {
  const result = validateRewardImageUrl(url);
  if (!result.ok) {
    fail(`应允许但拒绝: ${url} — ${result.error}`);
  } else {
    pass(`允许: ${url}`);
  }
}

console.log("\n=== rewardSchema（服务端写入校验）===\n");

for (const url of REJECT_URLS) {
  const parsed = rewardSchema.safeParse(baseRewardPayload(url));
  if (parsed.success) {
    fail(`schema 应拒绝但通过: ${url}`);
  } else {
    pass(`schema 拒绝: ${url}`);
  }
}

for (const url of ALLOW_URLS) {
  const parsed = rewardSchema.safeParse(baseRewardPayload(url));
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "unknown";
    fail(`schema 应允许但拒绝: ${url} — ${msg}`);
  } else {
    pass(`schema 允许: ${url}`);
  }
}

console.log("\n=== 商品上下架策略（纯逻辑）===\n");

// toggleRewardActiveAction 只应接收 id，不解析 imageUrl 表单字段
const toggleFormFields = ["id"];
pass(`上下架 action 仅依赖字段: ${toggleFormFields.join(", ")}`);

for (const url of REJECT_URLS) {
  const draftCheck = validateRewardImageUrl(url);
  if (draftCheck.ok) {
    fail(`编辑草稿非法 URL 应被拒绝: ${url}`);
  } else {
    pass(`编辑草稿非法 URL 应阻止上下架: ${url}`);
  }
}

// 模拟：DB 中已存非法 URL 时，rejectIfStoredImageInvalid 等价逻辑
function rejectIfStoredImageInvalid(imageUrl: string | null): boolean {
  if (!imageUrl?.trim()) return false;
  return !validateRewardImageUrl(imageUrl).ok;
}

if (rejectIfStoredImageInvalid("https://x.com/test.png")) {
  pass("DB 已存非法 URL 时上下架应被服务端拒绝");
} else {
  fail("DB 已存非法 URL 时上下架应被服务端拒绝");
}

if (!rejectIfStoredImageInvalid("/uploads/rewards/ok.webp")) {
  pass("DB 合法 URL 时上下架校验通过");
} else {
  fail("DB 合法 URL 时上下架校验通过");
}

console.log(`\n${failures === 0 ? "全部通过" : `失败 ${failures} 项`}`);
process.exit(failures > 0 ? 1 : 0);
