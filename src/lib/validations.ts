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
  tierId: z.string().min(1),
});

export const pointTierSchema = z.object({
  label: z.string().trim().min(1, "请填写档位名称").max(40, "档位名称过长"),
  priceAmount: z.coerce
    .number({ invalid_type_error: "请输入消费金额" })
    .positive("消费金额必须大于 0")
    .max(1000000, "消费金额过大"),
  points: z.coerce
    .number({ invalid_type_error: "请输入增加积分" })
    .positive("增加积分必须大于 0")
    .max(100000, "增加积分过大"),
  sortOrder: z.coerce.number().int("排序必须是整数").min(0, "排序不能为负").max(100000),
});

export const pointTierIdSchema = z.object({
  id: z.string().min(1),
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

// ===== Phase 2 =====

// 自定义增加/扣除积分
export const customAdjustSchema = z.object({
  bossId: z.string().min(1),
  direction: z.enum(["ADD", "DEDUCT"]),
  amount: z.coerce
    .number({ invalid_type_error: "请输入积分数量" })
    .positive("积分数量必须大于 0")
    .max(10000, "单次调整不能超过 10000 分"),
  reason: z.string().trim().min(1, "请填写原因备注").max(200, "备注过长"),
  // owner 可勾选允许扣成负分
  allowNegative: z.coerce.boolean().optional(),
});

// 撤销某条流水
export const voidTransactionSchema = z.object({
  transactionId: z.string().min(1),
  reason: z.string().trim().min(1, "请填写撤销原因").max(200, "原因过长"),
});

// 老板改名（带原因，可选）
export const bossRenameSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "请填写老板名字").max(40),
});

// 归档 / 恢复老板
export const bossArchiveSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(1, "请填写归档原因").max(200, "原因过长"),
});

export const bossRestoreSchema = z.object({
  id: z.string().min(1),
});

// 绑定 / 解绑用户账号
export const bossBindSchema = z.object({
  bossId: z.string().min(1),
  userId: z.string().min(1),
});

export const bossUnbindSchema = z.object({
  bossId: z.string().min(1),
});

// 后台兑换
export const redeemSchema = z.object({
  bossId: z.string().min(1),
  rewardItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "数量至少为 1").max(99).default(1),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
