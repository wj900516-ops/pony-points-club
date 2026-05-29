import { z } from "zod";
import { validateRewardImageUrl } from "@/lib/reward-image-url";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("邮箱格式不正确");

export const passwordSchema = z
  .string()
  .min(8, "密码至少 8 位")
  .max(72, "密码过长（bcrypt 上限 72 字节）");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, "请填写昵称").max(40, "昵称过长"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "请输入密码"),
});

export const bossCreateSchema = z.object({
  name: z.string().trim().min(1, "请填写老板名字").max(40),
});

export const bossUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "请填写老板名字").max(40),
});

export const addPointsSchema = z.object({
  bossId: z.string().min(1),
  tier: z.enum(["T49", "T188", "T388"]),
});

const rewardImageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .superRefine((val, ctx) => {
    if (!val) return;
    const result = validateRewardImageUrl(val);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
    }
  });

export const rewardSchema = z.object({
  name: z.string().trim().min(1, "请填写商品名称").max(60),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  imageUrl: rewardImageUrlSchema,
  pointsRequired: z.coerce.number().min(0, "积分不能为负"),
  stock: z.coerce.number().int().min(0, "库存不能为负"),
  isActive: z.coerce.boolean().optional(),
});

export const roleUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "VIEWER"]),
});
