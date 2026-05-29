"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trimNum, formatDateTime } from "@/lib/format";
import { redeemAction, type RedemptionRow } from "@/app/actions/redemptions";

interface BossOpt {
  id: string;
  name: string;
  totalPoints: string;
}
interface RewardOpt {
  id: string;
  name: string;
  pointsRequired: string;
  stock: number;
}

export default function RedemptionManager({
  bosses,
  rewards,
  redemptions,
}: {
  bosses: BossOpt[];
  rewards: RewardOpt[];
  redemptions: RedemptionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [bossId, setBossId] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  const boss = bosses.find((b) => b.id === bossId);
  const reward = rewards.find((r) => r.id === rewardId);

  const cost = useMemo(() => {
    const q = parseInt(quantity, 10);
    if (!reward || Number.isNaN(q) || q < 1) return null;
    return parseFloat(reward.pointsRequired) * q;
  }, [reward, quantity]);

  const insufficientPoints =
    boss && cost !== null && parseFloat(boss.totalPoints) < cost;
  const insufficientStock =
    reward && parseInt(quantity, 10) > reward.stock;

  function submit() {
    setMsg(null);
    if (!bossId) return setMsg("请选择老板");
    if (!rewardId) return setMsg("请选择商品");
    const fd = new FormData();
    fd.set("bossId", bossId);
    fd.set("rewardItemId", rewardId);
    fd.set("quantity", quantity || "1");
    fd.set("note", note.trim());
    startTransition(async () => {
      try {
        const res = await redeemAction(fd);
        if (!res.ok) return setMsg(res.error || "兑换失败");
        setMsg("✅ 兑换成功，已扣分并减库存");
        setRewardId("");
        setQuantity("1");
        setNote("");
        router.refresh();
      } catch {
        setMsg("网络异常，请稍后重试");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="pony-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="pony-label">选择老板</label>
            <select
              className="pony-input"
              value={bossId}
              onChange={(e) => setBossId(e.target.value)}
            >
              <option value="">— 请选择 —</option>
              {bosses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}（{trimNum(b.totalPoints)}分）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="pony-label">选择商品</label>
            <select
              className="pony-input"
              value={rewardId}
              onChange={(e) => setRewardId(e.target.value)}
            >
              <option value="">— 请选择 —</option>
              {rewards.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}（{trimNum(r.pointsRequired)}分 · 库存{r.stock}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="pony-label">数量</label>
            <input
              type="number"
              min="1"
              className="pony-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label className="pony-label">备注（可选）</label>
            <input
              className="pony-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        {cost !== null && (
          <p className="mt-3 text-sm text-slate-500">
            预计扣除：
            <span className="font-bold text-pony-pinkDeep">{trimNum(cost)}分</span>
            {insufficientPoints && (
              <span className="ml-2 text-rose-500">积分不足</span>
            )}
            {insufficientStock && (
              <span className="ml-2 text-rose-500">库存不足</span>
            )}
          </p>
        )}

        {msg && <p className="mt-2 text-sm text-pony-purpleDeep">{msg}</p>}

        <button
          className="pony-btn-primary mt-3 w-full sm:w-auto"
          disabled={pending || !!insufficientPoints || !!insufficientStock}
          onClick={submit}
        >
          {pending ? "兑换中…" : "确认兑换"}
        </button>
      </div>

      <div className="pony-card p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-600">兑换历史</h3>
        {redemptions.length === 0 ? (
          <p className="text-sm text-slate-400">暂无兑换记录</p>
        ) : (
          <ul className="space-y-2">
            {redemptions.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-slate-100 bg-white/60 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-700">{r.bossName}</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-slate-600">
                    {r.rewardName} ×{r.quantity}
                  </span>
                  <span className="ml-auto font-bold text-rose-500">
                    -{trimNum(r.pointsSpent)}分
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatDateTime(r.createdAt)} · 操作人 {r.operator}
                  {r.note ? ` · ${r.note}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
