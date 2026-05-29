// 纯前端可用的格式化工具（无 server-only 依赖）

// 把 ISO 时间格式化为 "YYYY-MM-DD HH:mm"
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

// 去掉小数尾随 0：1.00 -> "1"，0.20 -> "0.2"
export function trimNum(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "0";
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}
