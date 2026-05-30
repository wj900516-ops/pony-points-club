"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trimNum } from "@/lib/format";
import {
  createPointTierAction,
  togglePointTierActiveAction,
  updatePointTierAction,
} from "@/app/actions/point-tiers";

export interface PointTierRow {
  id: string;
  label: string;
  priceAmount: string;
  points: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyTier = {
  label: "",
  priceAmount: "",
  points: "",
  sortOrder: "0",
};

export default function PointTierManager({ tiers }: { tiers: PointTierRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.ok) {
          setMsg(res.error || "操作失败");
          return;
        }
        setMsg("已保存");
        after?.();
        router.refresh();
      } catch {
        setMsg("网络异常，请稍后重试");
      }
    });
  }

  function handleToggle(tier: PointTierRow) {
    const actionText = tier.isActive ? "停用" : "恢复";
    if (!window.confirm(`确认${actionText}积分档位「${tier.label}」吗？`)) return;
    const fd = new FormData();
    fd.set("id", tier.id);
    run(() => togglePointTierActiveAction(fd));
  }

  return (
    <div className="space-y-4">
      <details className="pony-card p-4" open>
        <summary className="cursor-pointer font-medium text-pony-purpleDeep">
          添加积分档位
        </summary>
        <TierForm
          key="new-tier"
          initial={emptyTier}
          submitLabel="添加档位"
          pending={pending}
          onSubmit={(fd, reset) => run(() => createPointTierAction(fd), reset)}
        />
      </details>

      {msg && <p className="text-sm text-pony-purpleDeep">{msg}</p>}

      <div className="grid grid-cols-1 gap-3">
        {tiers.map((tier) => (
          <div key={tier.id} className="pony-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-800">{tier.label}</span>
                  <span
                    className={`pony-badge ${
                      tier.isActive
                        ? "bg-green-100 text-green-600"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {tier.isActive ? "启用中" : "已停用"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                  <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
                    消费 {trimNum(tier.priceAmount)}
                  </span>
                  <span className="pony-badge bg-pony-pink/20 text-pony-pinkDeep">
                    +{trimNum(tier.points)}分
                  </span>
                  <span className="pony-badge bg-slate-100 text-slate-500">
                    排序 {tier.sortOrder}
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  className="pony-btn-ghost min-h-11 w-full sm:w-auto"
                  onClick={() => setEditId(editId === tier.id ? null : tier.id)}
                >
                  {editId === tier.id ? "收起" : "编辑"}
                </button>
                <button
                  type="button"
                  className={
                    tier.isActive
                      ? "min-h-11 w-full rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-500 shadow-sm hover:bg-rose-50 disabled:opacity-60 sm:w-auto"
                      : "pony-btn-ghost min-h-11 w-full sm:w-auto"
                  }
                  disabled={pending}
                  onClick={() => handleToggle(tier)}
                >
                  {tier.isActive ? "停用" : "恢复"}
                </button>
              </div>
            </div>

            {editId === tier.id && (
              <TierForm
                key={`edit-${tier.id}`}
                initial={{
                  label: tier.label,
                  priceAmount: tier.priceAmount,
                  points: tier.points,
                  sortOrder: String(tier.sortOrder),
                }}
                submitLabel="保存修改"
                pending={pending}
                onSubmit={(fd) => {
                  fd.set("id", tier.id);
                  run(() => updatePointTierAction(fd), () => setEditId(null));
                }}
              />
            )}
          </div>
        ))}
        {tiers.length === 0 && (
          <p className="text-sm text-slate-400">暂无积分档位，请先添加。</p>
        )}
      </div>
    </div>
  );
}

function TierForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial: {
    label: string;
    priceAmount: string;
    points: string;
    sortOrder: string;
  };
  submitLabel: string;
  pending: boolean;
  onSubmit: (fd: FormData, reset: () => void) => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [priceAmount, setPriceAmount] = useState(initial.priceAmount);
  const [points, setPoints] = useState(initial.points);
  const [sortOrder, setSortOrder] = useState(initial.sortOrder);

  function reset() {
    setLabel("");
    setPriceAmount("");
    setPoints("");
    setSortOrder("0");
  }

  return (
    <form
      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit(fd, reset);
      }}
    >
      <input
        name="label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="档位名称，例如 49.9"
        className="pony-input min-h-11 text-base"
        maxLength={40}
        required
      />
      <input
        name="priceAmount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={priceAmount}
        onChange={(e) => setPriceAmount(e.target.value)}
        placeholder="消费金额"
        className="pony-input min-h-11 text-base"
        required
      />
      <input
        name="points"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        placeholder="增加积分"
        className="pony-input min-h-11 text-base"
        required
      />
      <input
        name="sortOrder"
        type="number"
        inputMode="numeric"
        step="1"
        min="0"
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
        placeholder="排序"
        className="pony-input min-h-11 text-base"
      />
      <button
        type="submit"
        disabled={pending}
        className="pony-btn-primary min-h-11 sm:col-span-2 lg:col-span-4"
      >
        {pending ? "提交中..." : submitLabel}
      </button>
    </form>
  );
}
