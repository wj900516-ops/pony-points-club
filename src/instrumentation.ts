export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production") {
      const { assertProductionEnv } = await import("@/lib/auth-secret");
      assertProductionEnv();
    }

    const { getStorageDriver } = await import("@/lib/storage-driver");
    if (getStorageDriver() === "local" && process.env.VERCEL !== "1") {
      const { ensureRewardUploadDir } = await import("@/lib/ensure-upload-dir");
      await ensureRewardUploadDir().catch(() => {
        // 本地上传目录创建失败会在首次上传时重试
      });
    }
  }
}
