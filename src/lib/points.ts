// Point tier definitions now live in the database (PointTier).
// This file only keeps shared formatting labels for point transactions.

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

export const MANUAL_ADJUST_MAX = 10000;

export function formatPoints(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  const trimmed = Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
  return `${trimmed}分`;
}
