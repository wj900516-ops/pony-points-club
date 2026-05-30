"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trimNum, formatDateTime } from "@/lib/format";
import { fetchBossHistory, type HistoryRow } from "@/app/actions/history";
import {
  addPointsAction,
  customAdjustAction,
  voidTransactionAction,
} from "@/app/actions/points";

export interface BossView {
  id: string;
  name: string;
  totalPoints: string;
  boundLabel?: string | null;
}

export interface PointTierView {
  id: string;
  label: string;
  priceAmount: string;
  points: string;
}

export default function BossCard({
  boss,
  isStaff,
  isOwner = false,
  pointTiers = [],
}: {
  boss: BossView;
  isStaff: boolean;
  isOwner?: boolean;
  pointTiers?: PointTierView[];
}) {
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [submittingTier, setSubmittingTier] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 自定义调整
  const [adjDir, setAdjDir] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjAllowNeg, setAdjAllowNeg] = useState(false);

  // 撤销
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      setHistory(await fetchBossHistory(boss.id));
    } finally {
      setLoadingHistory(false);
    }
  }

  function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) void loadHistory();
  }

  async function refreshAll() {
    router.refresh();
    if (showHistory) await loadHistory();
  }

  async function handleAddTier(tierId: string) {
    if (submittingTier) return;
    setMsg(null);
    setSubmittingTier(tierId);
    const fd = new FormData();
    fd.set("bossId", boss.id);
    fd.set("tierId", tierId);
    try {
      const res = await addPointsAction(fd);
      if (!res.ok) return setMsg(res.error || "操作失败");
      setMsg("✅ 加分成功");
      await refreshAll();
    } catch {
      setMsg("网络异常，请稍后重试");
    } finally {
      setSubmittingTier(null);
    }
  }

  function handleCustomAdjust() {
    if (!adjAmount.trim()) return setMsg("请输入积分数量");
    if (!adjReason.trim()) return setMsg("请填写原因备注");
    setMsg(null);
    const fd = new FormData();
    fd.set("bossId", boss.id);
    fd.set("direction", adjDir);
    fd.set("amount", adjAmount.trim());
    fd.set("reason", adjReason.trim());
    fd.set("allowNegative", adjAllowNeg ? "true" : "false");
    startTransition(async () => {
      try {
        const res = await customAdjustAction(fd);
        if (!res.ok) return setMsg(res.error || "操作失败");
        setMsg("✅ 已记录");
        setAdjAmount("");
        setAdjReason("");
        setAdjAllowNeg(false);
        await refreshAll();
      } catch {
        setMsg("网络异常，请稍后重试");
      }
    });
  }

  function handleVoid(id: string) {
    if (!voidReason.trim()) return setMsg("请填写撤销原因");
    setMsg(null);
    const fd = new FormData();
    fd.set("transactionId", id);
    fd.set("reason", voidReason.trim());
    startTransition(async () => {
      try {
        const res = await voidTransactionAction(fd);
        if (!res.ok) return setMsg(res.error || "撤销失败");
        setVoidingId(null);
        setVoidReason("");
        await refreshAll();
      } catch {
        setMsg("网络异常，请稍后重试");
      }
    });
  }

  return (
    <div className="pony-card flex flex-col p-5">
      {/* 头部：会员积分卡风格 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-slate-800">{boss.name}</h3>
          {boss.boundLabel && (
            <p className="mt-0.5 truncate text-xs text-slate-400">
              已绑定 {boss.boundLabel}
            </p>
          )}
        </div>
        {isStaff && (
          <button
            onClick={() => setShowActions((v) => !v)}
            className="pony-btn-ghost shrink-0 px-3 py-2 text-sm"
            aria-expanded={showActions}
          >
            管理 <span aria-hidden>{showActions ? "▲" : "▼"}</span>
          </button>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="bg-pony-gradient bg-clip-text text-4xl font-black tabular-nums text-transparent">
          {trimNum(boss.totalPoints)}
        </span>
        <span className="text-sm font-medium text-slate-400">分</span>
      </div>

      {/* 管理操作区：仅 staff 可见，后端仍会再次校验权限 */}
      {isStaff && showActions && (
        <div className="mt-4 space-y-4 rounded-xl bg-pony-purple/5 p-3 ring-1 ring-pony-purple/15">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">固定档位加分</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {pointTiers.length === 0 && (
                <p className="text-sm text-slate-400">暂无可用积分档位</p>
              )}
              {pointTiers.map((t) => (
                <button
                  key={t.id}
                  disabled={submittingTier !== null || pending}
                  onClick={() => handleAddTier(t.id)}
                  className="pony-btn-pink w-full sm:w-auto"
                >
                  {submittingTier === t.id ? (
                    "提交中…"
                  ) : (
                    <>
                      {t.label || trimNum(t.priceAmount)}{" "}
                      <span className="opacity-80">(+{trimNum(t.points)}分)</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义调整 */}
          <div className="border-t border-pony-purple/10 pt-3">
            <p className="mb-2 text-xs font-medium text-slate-500">自定义调整积分</p>
            <div className="flex flex-wrap gap-2">
              <div className="flex overflow-hidden rounded-full ring-1 ring-pony-purple/30">
                <button
                  type="button"
                  onClick={() => setAdjDir("ADD")}
                  className={`px-3 py-2 text-sm ${adjDir === "ADD" ? "bg-pony-purpleDeep text-white" : "bg-white text-slate-500"}`}
                >
                  增加
                </button>
                <button
                  type="button"
                  onClick={() => setAdjDir("DEDUCT")}
                  className={`px-3 py-2 text-sm ${adjDir === "DEDUCT" ? "bg-pony-pinkDeep text-white" : "bg-white text-slate-500"}`}
                >
                  扣除
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="积分数量"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                className="pony-input w-full sm:w-32"
              />
            </div>
            <input
              type="text"
              placeholder="原因备注（必填）"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              maxLength={200}
              className="pony-input mt-2"
            />
            {isOwner && adjDir === "DEDUCT" && (
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={adjAllowNeg}
                  onChange={(e) => setAdjAllowNeg(e.target.checked)}
                />
                允许扣成负分（主理人专用）
              </label>
            )}
            <button
              onClick={handleCustomAdjust}
              disabled={pending}
              className="pony-btn-primary mt-2 w-full sm:w-auto"
            >
              {pending ? "提交中…" : adjDir === "ADD" ? "确认增加" : "确认扣除"}
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-pony-purpleDeep">{msg}</p>}

      <div className="mt-4">
        <button
          onClick={toggleHistory}
          className="text-sm font-medium text-pony-purpleDeep underline-offset-2 hover:underline"
        >
          {showHistory ? "收起历史记录" : "查看历史记录"}
        </button>
      </div>

      {showHistory && (
        <div className="mt-3 overflow-hidden rounded-xl border border-pony-purple/15 bg-white/70 p-3">
          {loadingHistory && <p className="text-sm text-slate-400">加载中…</p>}
          {!loadingHistory && history && history.length === 0 && (
            <p className="text-sm text-slate-400">暂无积分记录</p>
          )}
          {!loadingHistory && history && history.length > 0 && (
            <ul className="space-y-3">
              {history.map((h) => (
                <HistoryItem
                  key={h.id}
                  row={h}
                  isStaff={isStaff}
                  voiding={voidingId === h.id}
                  voidReason={voidReason}
                  pending={pending}
                  onStartVoid={() => {
                    setVoidingId(h.id);
                    setVoidReason("");
                    setMsg(null);
                  }}
                  onCancelVoid={() => setVoidingId(null)}
                  onChangeReason={setVoidReason}
                  onConfirmVoid={() => handleVoid(h.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryItem({
  row,
  isStaff,
  voiding,
  voidReason,
  pending,
  onStartVoid,
  onCancelVoid,
  onChangeReason,
  onConfirmVoid,
}: {
  row: HistoryRow;
  isStaff: boolean;
  voiding: boolean;
  voidReason: string;
  pending: boolean;
  onStartVoid: () => void;
  onCancelVoid: () => void;
  onChangeReason: (v: string) => void;
  onConfirmVoid: () => void;
}) {
  const delta = parseFloat(row.pointsDelta);
  const positive = delta >= 0;
  const voided = row.status === "VOIDED";

  return (
    <li className="border-b border-dashed border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`pony-badge ${typeBadgeClass(row.type)}`}>
          {row.typeLabel}
        </span>
        {voided && (
          <span className="pony-badge bg-slate-200 text-slate-500">已撤销</span>
        )}
        <span
          className={`ml-auto text-base font-bold tabular-nums ${
            voided
              ? "text-slate-300 line-through"
              : positive
                ? "text-emerald-600"
                : "text-rose-500"
          }`}
        >
          {positive ? "+" : ""}
          {trimNum(row.pointsDelta)}分
        </span>
      </div>

      <div className="mt-1.5 grid gap-0.5 text-xs text-slate-500">
        <div>
          <span className="text-slate-400">时间 </span>
          <span className="font-mono">{formatDateTime(row.createdAt)}</span>
        </div>
        {row.priceTier && (
          <div>
            <span className="text-slate-400">档位 </span>
            {trimNum(row.priceTier)}
          </div>
        )}
        {row.rewardName && (
          <div>
            <span className="text-slate-400">商品 </span>
            {row.rewardName}
          </div>
        )}
        <div>
          <span className="text-slate-400">操作人 </span>
          {row.createdBy}
        </div>
        {row.note && (
          <div className="break-words">
            <span className="text-slate-400">备注 </span>
            {row.note}
          </div>
        )}
        {voided && (
          <div className="break-words text-slate-400">
            撤销人 {row.voidedBy ?? "—"}
            {row.voidedAt ? ` · ${formatDateTime(row.voidedAt)}` : ""}
            {row.voidReason ? ` · ${row.voidReason}` : ""}
          </div>
        )}
      </div>

      {/* 撤销操作：仅 staff，且记录可撤销 */}
      {isStaff && row.canVoid && (
        <div className="mt-2">
          {voiding ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="撤销原因（必填）"
                value={voidReason}
                maxLength={200}
                onChange={(e) => onChangeReason(e.target.value)}
                className="pony-input h-9 min-h-0 flex-1 py-1 text-sm"
              />
              <button
                onClick={onConfirmVoid}
                disabled={pending}
                className="pony-btn-pink h-9 min-h-0 px-3 py-1 text-sm"
              >
                确认撤销
              </button>
              <button
                onClick={onCancelVoid}
                className="pony-btn-ghost h-9 min-h-0 px-3 py-1 text-sm"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={onStartVoid}
              className="text-xs font-medium text-rose-500 hover:underline"
            >
              撤销此记录
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function typeBadgeClass(type: string): string {
  switch (type) {
    case "PURCHASE":
      return "bg-pony-pink/30 text-pony-pinkDeep";
    case "MANUAL_ADD":
      return "bg-emerald-100 text-emerald-600";
    case "MANUAL_DEDUCT":
      return "bg-rose-100 text-rose-500";
    case "REDEMPTION":
      return "bg-amber-100 text-amber-600";
    case "REVERSAL":
      return "bg-slate-200 text-slate-500";
    default:
      return "bg-slate-100 text-slate-500";
  }
}
