"use client";

import { useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function loadHistory() {
    setLoadingHistory(true);
    const rows = await fetchBossHistory(boss.id);
    setHistory(rows);
    setLoadingHistory(false);
  }

  function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) void loadHistory();
  }

  function handleAdd(tierKey: string) {
    setMsg(null);
    const fd = new FormData();
    fd.set("bossId", boss.id);
    fd.set("tier", tierKey);
    startTransition(async () => {
      const res = await addPointsAction(fd);
      if (!res.ok) {
        setMsg(res.error || "操作失败");
        return;
      }
      setMsg("✅ 加分成功");
      router.refresh();
      if (showHistory) await loadHistory();
    });
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
                disabled={pending}
                onClick={() => handleAdd(t.key)}
                className="pony-btn-pink w-full sm:w-auto"
              >
                {pending ? (
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
        <div className="mt-3 overflow-x-auto rounded-xl border border-pony-purple/20 bg-white/70 p-3">
          {loadingHistory && (
            <p className="text-sm text-slate-400">加载中…</p>
          )}
          {!loadingHistory && history && history.length === 0 && (
            <p className="text-sm text-slate-400">暂无积分记录</p>
          )}
          {!loadingHistory && history && history.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex min-w-[280px] flex-col gap-1 border-b border-dashed border-slate-100 pb-2 last:border-0 sm:min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-0.5 sm:pb-1.5"
                >
                  <span className="break-all font-mono text-xs text-slate-500 sm:text-sm">
                    {formatDateTime(h.createdAt)}
                  </span>
                  <span className="hidden text-slate-300 sm:inline">|</span>
                  <span className="text-slate-600">{trimNum(h.priceTier)}</span>
                  <span className="hidden text-slate-300 sm:inline">|</span>
                  <span className="font-semibold text-pony-pinkDeep">
                    +{trimNum(h.pointsAdded)}分
                  </span>
                  <span className="text-xs text-slate-400 sm:ml-auto">
                    {h.createdBy}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
