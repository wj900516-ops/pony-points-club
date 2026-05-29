import "server-only";

const WEAK_SECRETS = new Set([
  "",
  "please-change-me-to-a-long-random-string-min-32-chars",
  "changeme",
  "change-me",
  "secret",
  "your-secret-here",
]);

/** 校验 AUTH_SECRET；生产环境要求 ≥32 字符且非已知弱值 */
export function getAuthSecretBytes(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  const minLength = process.env.NODE_ENV === "production" ? 32 : 16;

  if (!secret || secret.length < minLength) {
    throw new Error(
      `AUTH_SECRET 未配置或过短（至少 ${minLength} 字符）。生成：openssl rand -base64 48`
    );
  }

  if (WEAK_SECRETS.has(secret.toLowerCase())) {
    throw new Error(
      "AUTH_SECRET 不能使用默认值或弱密码，请运行：openssl rand -base64 48"
    );
  }

  return new TextEncoder().encode(secret);
}

/** 生产环境启动前检查关键配置 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  getAuthSecretBytes();
  if (process.env.AUTH_COOKIE_SECURE !== "true") {
    throw new Error("生产环境必须设置 AUTH_COOKIE_SECURE=true（HTTPS）");
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl || !siteUrl.startsWith("https://")) {
    throw new Error(
      "生产环境 NEXT_PUBLIC_SITE_URL 必须设为 HTTPS 正式域名"
    );
  }

  // Vercel 生产必须使用 Supabase Storage（不能写 public/uploads）
  const onVercel = process.env.VERCEL === "1";
  const storageDriver =
    process.env.STORAGE_DRIVER?.trim().toLowerCase() ||
    (onVercel ? "supabase" : "local");

  if (onVercel || storageDriver === "supabase") {
    if (!process.env.SUPABASE_URL?.trim()) {
      throw new Error("生产/Vercel 请设置 SUPABASE_URL");
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      throw new Error("生产/Vercel 请设置 SUPABASE_SERVICE_ROLE_KEY");
    }
  }
}
