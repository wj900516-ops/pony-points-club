"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trimNum } from "@/lib/format";
import {
  createRewardAction,
  updateRewardAction,
  toggleRewardAction,
} from "@/app/actions/rewards";
import RewardImageUpload from "@/components/admin/RewardImageUpload";

interface RewardRow {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  pointsRequired: string;
  stock: number;
  isActive: boolean;
}

const empty = {
  name: "",
  description: "",
  imageUrl: "",
  pointsRequired: "",
  stock: "",
};

export default function RewardManager({ rewards }: { rewards: RewardRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setMsg(res.error || "操作失败");
      else {
        setMsg("✅ 已保存");
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <details className="pony-card p-4">
        <summary className="cursor-pointer font-medium text-pony-purpleDeep">
          + 新增商品
        </summary>
        <RewardForm
          key="new-reward"
          initial={empty}
          submitLabel="创建商品"
          pending={pending}
          onSubmit={(fd, reset) => run(() => createRewardAction(fd), reset)}
        />
      </details>

      {msg && <p className="text-sm text-pony-purpleDeep">{msg}</p>}

      <div className="grid grid-cols-1 gap-3">
        {rewards.map((r) => (
          <div key={r.id} className="pony-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-800">{r.name}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
                    {trimNum(r.pointsRequired)}分
                  </span>
                  <span className="pony-badge bg-slate-100 text-slate-500">
                    库存 {r.stock}
                  </span>
                  <span
                    className={`pony-badge ${
                      r.isActive
                        ? "bg-green-100 text-green-600"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {r.isActive ? "已上架" : "已下架"}
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  className="pony-btn-ghost w-full sm:w-auto"
                  onClick={() => setEditId(editId === r.id ? null : r.id)}
                >
                  {editId === r.id ? "收起" : "编辑"}
                </button>
                <button
                  className="pony-btn-ghost w-full sm:w-auto"
                  disabled={pending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", r.id);
                    run(() => toggleRewardAction(fd));
                  }}
                >
                  {r.isActive ? "下架" : "上架"}
                </button>
              </div>
            </div>

            {editId === r.id && (
              <RewardForm
                key={`edit-${r.id}`}
                initial={{
                  name: r.name,
                  description: r.description,
                  imageUrl: r.imageUrl,
                  pointsRequired: r.pointsRequired,
                  stock: String(r.stock),
                }}
                submitLabel="保存修改"
                pending={pending}
                onSubmit={(fd) => {
                  fd.set("id", r.id);
                  run(() => updateRewardAction(fd), () => setEditId(null));
                }}
              />
            )}
          </div>
        ))}
        {rewards.length === 0 && (
          <p className="text-sm text-slate-400">暂无商品</p>
        )}
      </div>
    </div>
  );
}

function RewardForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial: {
    name: string;
    description: string;
    imageUrl: string;
    pointsRequired: string;
    stock: string;
  };
  submitLabel: string;
  pending: boolean;
  onSubmit: (fd: FormData, reset: () => void) => void;
}) {
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);

  return (
    <form
      className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"
      action={(fd) => {
        fd.set("isActive", active ? "true" : "false");
        fd.set("imageUrl", imageUrl);
        onSubmit(fd, () => {
          setImageUrl("");
        });
      }}
    >
      <div className="md:col-span-2">
        <label className="pony-label">商品名称</label>
        <input name="name" required defaultValue={initial.name} className="pony-input" />
      </div>
      <div className="md:col-span-2">
        <label className="pony-label">描述</label>
        <textarea
          name="description"
          defaultValue={initial.description}
          className="pony-input min-h-[88px]"
          rows={2}
        />
      </div>
      <div className="md:col-span-2">
        <label className="pony-label">商品图片</label>
        <RewardImageUpload value={imageUrl} onChange={setImageUrl} />
      </div>
      <div className="md:col-span-2">
        <label className="pony-label">
          图片地址（上传后自动填入 Supabase / 本地路径，或手动填 OSS/COS URL）
        </label>
        <input
          name="imageUrlDisplay"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="pony-input"
          placeholder="/uploads/rewards/reward-xxx.webp"
        />
      </div>
      <div>
        <label className="pony-label">所需积分</label>
        <input
          name="pointsRequired"
          type="number"
          step="0.1"
          min="0"
          required
          defaultValue={initial.pointsRequired}
          className="pony-input"
        />
      </div>
      <div>
        <label className="pony-label">库存</label>
        <input
          name="stock"
          type="number"
          min="0"
          required
          defaultValue={initial.stock}
          className="pony-input"
        />
      </div>
      <div className="flex min-h-[44px] items-center gap-2">
        <input
          id={`active-${submitLabel}`}
          type="checkbox"
          className="h-5 w-5"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <label htmlFor={`active-${submitLabel}`} className="text-base text-slate-600">
          上架（前台可见）
        </label>
      </div>
      <div className="md:col-span-2">
        <button className="pony-btn-primary w-full sm:w-auto" disabled={pending} type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
