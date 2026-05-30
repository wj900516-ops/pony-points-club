const LOCAL_PREFIXES = ["/rewards/", "/images/", "/uploads/"] as const;

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

export type RewardImageUrlClientValidation =
  | { ok: true; url: string }
  | { ok: false; error: string };

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

function isSupabaseStorageHost(hostname: string, pathname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".supabase.co") && pathname.includes("/storage/v1/object/");
}

function isAliyunOssHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".aliyuncs.com") || h.endsWith(".aliyuncs.com.cn");
}

function isTencentCosHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith(".myqcloud.com");
}

export function validateRewardImageUrlClient(
  raw: string
): RewardImageUrlClientValidation {
  try {
    const url = String(raw ?? "").trim();
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
      isSupabaseStorageHost(host, parsed.pathname) ||
      isAliyunOssHost(host) ||
      isTencentCosHost(host)
    ) {
      return { ok: true, url };
    }

    return {
      ok: false,
      error:
        "仅允许本地路径、Supabase Storage、阿里云 OSS 或腾讯云 COS 图片链接",
    };
  } catch {
    return { ok: false, error: "请先修正图片链接后再上架/下架" };
  }
}

export function draftImageUrlToggleError(raw: string): string | null {
  try {
    const result = validateRewardImageUrlClient(raw);
    return result.ok ? null : result.error;
  } catch {
    return "请先修正图片链接后再上架/下架";
  }
}

export default draftImageUrlToggleError;
