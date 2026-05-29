"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { POINT_TIER_LIST } from "@/lib/points";
import { trimNum, formatDateTime } from "@/lib/format";
import { fetchBossHistory, type HistoryRow } from "@/app/actions/history";
import { addPointsAction } from "@/app/actions/points";

export interface BossView {
  id: string;
  name: string;
  totalPoints: string;
}

export default function BossCard({
  boss,
  isStaff,
}: {
  boss: BossView;
  isStaff: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [submittingTier, setSubmittingTier] = useState<string | null>(null);
  const router = useRouter();

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const rows = await fetchBossHistory(boss.id);
      setHistory(rows);
    } finally {
      setLoadingHistory(false);
    }
  }

  function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) void loadHistory();
  }

  async function handleAdd(tierKey: string) {
    if (submittingTier) return;
    setMsg(null);
    setSubmittingTier(tierKey);
    const fd = new FormData();
    fd.set("bossId", boss.id);
    fd.set("tier", tierKey);
    try {
      const res = await addPointsAction(fd);
      if (!res.ok) {
        setMsg(res.error || "操作失败");
        return;
      }
      setMsg("✅ 加分成功");
      router.refresh();
      if (showHistory) await loadHistory();
    } catch {
      setMsg("网络异常，请稍后重试");
    } finally {
      setSubmittingTier(null);
    }
  }

  return (
    <div className="pony-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{boss.name}</h3>
          <p className="mt-1 text-3xl font-extrabold text-pony-purpleDeep">
            {trimNum(boss.totalPoints)}
            <span className="ml-1 text-base font-medium text-slate-400">分</span>
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowActions((v) => !v)}
            className="pony-btn-ghost shrink-0"
            aria-expanded={showActions}
            title="管理操作"
          >
            管理 <span>{showActions ? "▲" : "▼"}</span>
          </button>
        )}
      </div>

      {/* 加积分操作区：仅 staff 可见，后端仍会再次校验权限 */}
      {isStaff && showActions && (
        <div className="mt-4 rounded-xl bg-pony-purple/10 p-3">
          <p className="mb-2 text-xs text-slate-500">选择档位为该老板加分：</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {POINT_TIER_LIST.map((t) => (
              <button
                key={t.key}
                disabled={submittingTier !== null}
                onClick={() => handleAdd(t.key)}
                className="pony-btn-pink w-full sm:w-auto"
              >
                {submittingTier === t.key ? (
                  <>提交中…</>
                ) : (
                  <>
                    {t.price}{" "}
                    <span className="opacity-80">(+{trimNum(t.points)}分)</span>
                  </>
                )}
              </button>
            ))}
          </div>
          {msg && <p className="mt-2 text-sm text-pony-purpleDeep">{msg}</p>}
        </div>
      )}

      <div className="mt-4">
        <button onClick={toggleHistory} className="pony-btn-ghost w-full sm:w-auto">
          {showHistory ? "收起历史积分" : "查看历史积分"}
        </button>
      </div>

      {showHistory && (
        <div className="mt-3 overflow-hidden rounded-xl border border-pony-purple/20 bg-white/70 p-3">
          {loadingHistory && (
            <p className="text-sm text-slate-400">加载中…</p>
          )}
          {!loadingHistory && history && history.length === 0 && (
            <p className="text-sm text-slate-400">暂无积分记录</p>
          )}
          {!loadingHistory && history && history.length > 0 && (
            <>
              {/* 移动端：纵向卡片，避免横向溢出 */}
              <ul className="space-y-3 md:hidden">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="space-y-1 border-b border-dashed border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="text-xs text-slate-500">
                      <span className="text-slate-400">时间 </span>
                      <span className="break-words font-mono">
                        {formatDateTime(h.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="text-slate-400">档位 </span>
                      {trimNum(h.priceTier)}
                    </div>
                    <div className="text-sm font-semibold text-pony-pinkDeep">
                      <span className="font-normal text-slate-400">积分 </span>
                      +{trimNum(h.pointsAdded)}分
                    </div>
                    <div className="text-xs text-slate-400">
                      <span>操作人 </span>
                      <span className="break-words">{h.createdBy}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* md+：横向列表 */}
              <ul className="hidden space-y-1.5 text-sm md:block">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-dashed border-slate-100 pb-1.5 last:border-0"
                  >
                    <span className="break-words font-mono text-xs text-slate-500 sm:text-sm">
                      {formatDateTime(h.createdAt)}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">{trimNum(h.priceTier)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold text-pony-pinkDeep">
                      +{trimNum(h.pointsAdded)}分
                    </span>
                    <span className="break-words text-xs text-slate-400 md:ml-auto">
                      {h.createdBy}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
