/** 商品图默认占位（本地静态资源，不依赖外网） */
export const DEFAULT_REWARD_IMAGE = "/rewards/placeholder.svg";

const LOCAL_PREFIXES = ["/rewards/", "/images/", "/uploads/"] as const;

/** 大陆访问不稳定或不符合部署策略的域名后缀 */
const BLOCKED_HOST_SUFFIXES = [
  "google.com",
  "googleapis.com",
  "gstatic.com",
  "firebaseapp.com",
  "youtube.com",
  "ytimg.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "vercel.app",
] as const;

function getSiteHostname(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return BLOCKED_HOST_SUFFIXES.some(
    (suffix) => h === suffix || h.endsWith(`.${suffix}`)
  );
}

function isLocalPath(url: string): boolean {
  if (!url.startsWith("/") || url.startsWith("//")) return false;
  if (url.includes("://")) return false;
  return LOCAL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function isAliyunOssHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".aliyuncs.com") || h.endsWith(".aliyuncs.com.cn");
}

/** *.myqcloud.com 与 *.cos.*.myqcloud.com 均在此范围内 */
function isTencentCosHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith(".myqcloud.com");
}

function isSupabaseStorageHost(hostname: string, pathname: string): boolean {
  const h = hostname.toLowerCase();
  if (!h.endsWith(".supabase.co")) return false;
  return pathname.includes("/storage/v1/object/");
}

function isOwnSiteHost(hostname: string): boolean {
  const siteHost = getSiteHostname();
  if (!siteHost) return false;
  return hostname.toLowerCase() === siteHost;
}

export type RewardImageValidation =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** 服务端校验商品图片 URL（写入数据库前必须通过） */
export function validateRewardImageUrl(raw: string): RewardImageValidation {
  const url = raw.trim();
  if (!url) return { ok: true, url: "" };

  if (isLocalPath(url)) return { ok: true, url };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "图片地址格式不正确" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "外链图片必须使用 HTTPS" };
  }

  const host = parsed.hostname.toLowerCase();
  if (isBlockedHost(host)) {
    return {
      ok: false,
      error: "不允许使用该域名的图片链接（大陆访问不稳定或被禁止）",
    };
  }

  if (
    isOwnSiteHost(host) ||
    isAliyunOssHost(host) ||
    isTencentCosHost(host) ||
    isSupabaseStorageHost(host, parsed.pathname)
  ) {
    return { ok: true, url };
  }

  return {
    ok: false,
    error:
      "仅允许本地路径、本站域名、Supabase Storage、阿里云 OSS 或腾讯云 COS",
  };
}

/** 前台展示：空值或非法历史数据均回退到本地占位图 */
export function resolveRewardImageForDisplay(
  raw: string | null | undefined
): string {
  if (!raw?.trim()) return DEFAULT_REWARD_IMAGE;
  const result = validateRewardImageUrl(raw);
  if (!result.ok || !result.url) return DEFAULT_REWARD_IMAGE;
  return result.url;
}
