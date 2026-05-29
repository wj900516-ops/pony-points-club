// 积分档位规则 —— 这是唯一的「真相来源」，前后端都从这里取，禁止前端自定义。
// 49.9 -> 0.2 分；188 -> 1 分；388 -> 2 分

export type PriceTierKey = "T49" | "T188" | "T388";

export interface PointTier {
  key: PriceTierKey;
  price: number; // 价格档位
  points: number; // 增加的积分
  label: string; // UI 显示文案
}

export const POINT_TIERS: Record<PriceTierKey, PointTier> = {
  T49: { key: "T49", price: 49.9, points: 0.2, label: "49.9 → +0.2分" },
  T188: { key: "T188", price: 188, points: 1, label: "188 → +1分" },
  T388: { key: "T388", price: 388, points: 2, label: "388 → +2分" },
};

export const POINT_TIER_LIST: PointTier[] = [
  POINT_TIERS.T49,
  POINT_TIERS.T188,
  POINT_TIERS.T388,
];

export function getTier(key: string): PointTier | null {
  if (key === "T49" || key === "T188" || key === "T388") {
    return POINT_TIERS[key];
  }
  return null;
}

// 流水类型展示文案（与 Prisma enum TransactionType 对应）
export type TransactionTypeKey =
  | "PURCHASE"
  | "MANUAL_ADD"
  | "MANUAL_DEDUCT"
  | "REDEMPTION"
  | "REVERSAL";

export const TRANSACTION_TYPE_LABEL: Record<TransactionTypeKey, string> = {
  PURCHASE: "消费积分",
  MANUAL_ADD: "手动增加",
  MANUAL_DEDUCT: "手动扣除",
  REDEMPTION: "兑换扣除",
  REVERSAL: "撤销",
};

export function transactionTypeLabel(type: string): string {
  return TRANSACTION_TYPE_LABEL[type as TransactionTypeKey] ?? type;
}

// 自定义调整积分的上限（单次），防止误操作输入超大数值
export const MANUAL_ADJUST_MAX = 10000;

// 把 Decimal / number / string 统一格式化成「X分」展示
export function formatPoints(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  // 去掉无意义的尾随 0：1.00 -> 1，0.20 -> 0.2
  const trimmed = Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
  return `${trimmed}分`;
}
