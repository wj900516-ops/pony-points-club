import "server-only";

export type StorageDriver = "local" | "supabase";

/** 本地默认 local；Vercel / 显式 STORAGE_DRIVER=supabase 时使用 Supabase Storage */
export function getStorageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (explicit === "supabase" || explicit === "local") {
    return explicit;
  }
  if (process.env.VERCEL === "1") {
    return "supabase";
  }
  return "local";
}

export function getSupabaseStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "reward-images";
}
