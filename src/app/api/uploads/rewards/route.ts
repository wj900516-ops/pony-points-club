import { NextResponse } from "next/server";
import { AuthError, ForbiddenError, requireStaff } from "@/lib/permissions";
import {
  REWARD_UPLOAD_MAX_BYTES,
  buildRewardUploadFilename,
  isAllowedRewardUploadMime,
  validateRewardUploadMagic,
} from "@/lib/reward-upload";
import {
  RewardImageStorageError,
  saveRewardImage,
} from "@/lib/storage/reward-image-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireStaff();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "无权上传图片" }, { status: 403 });
    }
    throw e;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求格式有误" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "请选择图片文件" }, { status: 400 });
  }

  if (file.size > REWARD_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "图片大小不能超过 5MB" }, { status: 400 });
  }

  if (!isAllowedRewardUploadMime(file.type)) {
    return NextResponse.json(
      { error: "仅支持 JPEG、PNG、WebP、GIF 图片" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateRewardUploadMagic(buffer, file.type)) {
    return NextResponse.json({ error: "文件内容与类型不符" }, { status: 400 });
  }

  const filename = buildRewardUploadFilename(file.type);

  try {
    const url = await saveRewardImage(buffer, file.type, filename);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof RewardImageStorageError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    throw e;
  }
}
