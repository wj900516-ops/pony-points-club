"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trimNum } from "@/lib/format";
import {
  createBossAction,
  updateBossAction,
  setBossActiveAction,
} from "@/app/actions/bosses";

interface BossRow {
  id: string;
  name: string;
  totalPoints: string;
  isActive: boolean;
}

export default function BossManager({ bosses }: { bosses: BossRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.ok) setMsg(res.error || "操作失败");
        else {
          setMsg("✅ 已保存");
          router.refresh();
        }
      } catch {
        setMsg("网络异常，请稍后重试");
      }
    });
  }

  function add() {
    if (!newName.trim()) return;
    const fd = new FormData();
    fd.set("name", newName.trim());
    run(() => createBossAction(fd));
    setNewName("");
  }

  function saveEdit(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("name", editName.trim());
    run(() => updateBossAction(fd));
    setEditId(null);
  }

  function toggleActive(id: string, isActive: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("isActive", isActive ? "false" : "true");
    run(() => setBossActiveAction(fd));
  }

  return (
    <div className="pony-card p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          className="pony-input w-full sm:max-w-xs"
          placeholder="新老板名字"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="pony-btn-primary w-full sm:w-auto" onClick={add} disabled={pending}>
          + 新增老板
        </button>
      </div>
      {msg && <p className="mb-2 text-sm text-pony-purpleDeep">{msg}</p>}

      <div className="divide-y divide-slate-100">
        {bosses.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center gap-2 py-2 text-sm"
          >
            {editId === b.id ? (
              <>
                <input
                  className="pony-input w-full sm:max-w-xs"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    className="pony-btn-primary w-full sm:w-auto"
                    onClick={() => saveEdit(b.id)}
                    disabled={pending}
                  >
                    保存
                  </button>
                  <button
                    className="pony-btn-ghost w-full sm:w-auto"
                    onClick={() => setEditId(null)}
                  >
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <span
                  className={`w-full font-medium sm:w-auto ${b.isActive ? "text-slate-700" : "text-slate-400"}`}
                >
                  {b.name}
                </span>
                {!b.isActive && (
                  <span className="pony-badge bg-slate-100 text-slate-500">已归档</span>
                )}
                <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
                  {trimNum(b.totalPoints)}分
                </span>
                <button
                  className="pony-btn-ghost w-full sm:w-auto"
                  onClick={() => {
                    setEditId(b.id);
                    setEditName(b.name);
                  }}
                >
                  改名
                </button>
                <button
                  className="pony-btn-ghost w-full sm:ml-auto sm:w-auto"
                  onClick={() => toggleActive(b.id, b.isActive)}
                  disabled={pending}
                >
                  {b.isActive ? "归档" : "恢复显示"}
                </button>
              </>
            )}
          </div>
        ))}
        {bosses.length === 0 && (
          <p className="py-3 text-sm text-slate-400">暂无老板</p>
        )}
      </div>
    </div>
  );
}
