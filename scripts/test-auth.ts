import {
  PASSWORD_RESET_PUBLIC_MESSAGE,
  canUsePasswordResetToken,
  generatePasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
  isPasswordResetTokenExpired,
} from "../src/lib/password-reset-token";
import { SESSION_MAX_AGE_SECONDS } from "../src/lib/session-config";

let failures = 0;

function fail(message: string) {
  console.error(`FAIL ${message}`);
  failures++;
}

function pass(message: string) {
  console.log(`PASS ${message}`);
}

const token = generatePasswordResetToken();
const hash = hashPasswordResetToken(token);
const hashAgain = hashPasswordResetToken(token);

if (token.length >= 32 && hash.length === 64 && hash === hashAgain && hash !== token) {
  pass("reset token is random-looking and hashes deterministically with sha256");
} else {
  fail("reset token generation/hash verification failed");
}

const now = new Date("2026-05-29T12:00:00.000Z");
const expiresAt = getPasswordResetExpiry(now);
if (
  !isPasswordResetTokenExpired(expiresAt, now) &&
  isPasswordResetTokenExpired(expiresAt, new Date(expiresAt.getTime()))
) {
  pass("token expiry uses a 1 hour boundary");
} else {
  fail("token expiry boundary is incorrect");
}

if (canUsePasswordResetToken({ expiresAt, usedAt: null }, now)) {
  pass("unused non-expired token can be used");
} else {
  fail("unused non-expired token should be usable");
}

if (!canUsePasswordResetToken({ expiresAt, usedAt: now }, now)) {
  pass("used token cannot be reused");
} else {
  fail("used token should not be reusable");
}

if (
  !canUsePasswordResetToken(
    { expiresAt: new Date(now.getTime() - 1), usedAt: null },
    now
  )
) {
  pass("expired token cannot be used");
} else {
  fail("expired token should not be usable");
}

if (PASSWORD_RESET_PUBLIC_MESSAGE === "如果该邮箱存在，我们会发送重置密码链接。") {
  pass("forgot password public message does not disclose account existence");
} else {
  fail("forgot password public message changed or leaks account existence");
}

if (SESSION_MAX_AGE_SECONDS === 2_592_000) {
  pass("session maxAge is 30 days / 2592000 seconds");
} else {
  fail(`session maxAge should be 2592000 seconds, got ${SESSION_MAX_AGE_SECONDS}`);
}

console.log(`\n${failures === 0 ? "ALL PASS" : `FAILURES ${failures}`}`);
process.exit(failures > 0 ? 1 : 0);
