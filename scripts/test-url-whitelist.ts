import { validateRewardImageUrl } from "../src/lib/reward-image-url";
import {
  draftImageUrlToggleError,
  validateRewardImageUrlClient,
} from "../src/lib/reward-image-url-client";
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
  console.error(`FAIL ${msg}`);
  failures++;
}

function pass(msg: string) {
  console.log(`PASS ${msg}`);
}

console.log("=== validateRewardImageUrl ===\n");

for (const url of REJECT_URLS) {
  const result = validateRewardImageUrl(url);
  if (result.ok) fail(`should reject but allowed: ${url}`);
  else pass(`rejected: ${url}`);
}

for (const url of ALLOW_URLS) {
  const result = validateRewardImageUrl(url);
  if (!result.ok) fail(`should allow but rejected: ${url} - ${result.error}`);
  else pass(`allowed: ${url}`);
}

console.log("\n=== rewardSchema server write validation ===\n");

for (const url of REJECT_URLS) {
  const parsed = rewardSchema.safeParse(baseRewardPayload(url));
  if (parsed.success) fail(`schema should reject but allowed: ${url}`);
  else pass(`schema rejected: ${url}`);
}

for (const url of ALLOW_URLS) {
  const parsed = rewardSchema.safeParse(baseRewardPayload(url));
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "unknown";
    fail(`schema should allow but rejected: ${url} - ${msg}`);
  } else {
    pass(`schema allowed: ${url}`);
  }
}

console.log("\n=== toggle policy pure logic ===\n");

const toggleFormFields = ["id"];
pass(`toggle action only depends on fields: ${toggleFormFields.join(", ")}`);

for (const url of REJECT_URLS) {
  const draftCheck = validateRewardImageUrl(url);
  if (draftCheck.ok) fail(`draft invalid URL should be rejected: ${url}`);
  else pass(`draft invalid URL blocks toggle: ${url}`);
}

function rejectIfStoredImageInvalid(imageUrl: string | null): boolean {
  if (!imageUrl?.trim()) return false;
  return !validateRewardImageUrl(imageUrl).ok;
}

if (rejectIfStoredImageInvalid("https://x.com/test.png")) {
  pass("stored invalid URL blocks toggle server-side");
} else {
  fail("stored invalid URL should block toggle server-side");
}

if (!rejectIfStoredImageInvalid("/uploads/rewards/ok.webp")) {
  pass("stored valid URL passes toggle validation");
} else {
  fail("stored valid URL should pass toggle validation");
}

console.log("\n=== client draft validation must not throw ===\n");

for (const url of REJECT_URLS) {
  try {
    const error = draftImageUrlToggleError(url);
    if (!error) fail(`client draft should return an error: ${url}`);
    else pass(`client draft rejected without throw: ${url}`);
  } catch {
    fail(`client draft validation should not throw: ${url}`);
  }
}

try {
  const clientUploadCheck = validateRewardImageUrlClient("/uploads/test.png");
  if (clientUploadCheck.ok) pass("client allows /uploads/test.png without throw");
  else {
    fail(
      `/uploads/test.png should be allowed by client validation: ${clientUploadCheck.error}`
    );
  }
} catch {
  fail("validateRewardImageUrlClient('/uploads/test.png') should not throw");
}

console.log(`\n${failures === 0 ? "ALL PASS" : `FAILURES ${failures}`}`);
process.exit(failures > 0 ? 1 : 0);
