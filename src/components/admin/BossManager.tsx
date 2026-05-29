"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trimNum } from "@/lib/format";
import {
  createBossAction,
  updateBossAction,
  archiveBossAction,
  restoreBossAction,
  bindBossUserAction,
  unbindBossUserAction,
} from "@/app/actions/bosses";
import { fetchBindableUsers, type BindableUser } from "@/app/actions/users";

interface BossRow {
  id: string;
  name: string;
  totalPoints: string;
  isActive: boolean;
  boundEmail: string | null;
  archiveReason: string | null;
}

type Result = { ok: boolean; error?: string };

export default function BossManager({ bosses }: { bosses: BossRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bosses;
    return bosses.filter((b) => b.name.toLowerCase().includes(q));
  }, [bosses, query]);

  function run(action: () => Promise<Result>, after?: () => void) {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.ok) setMsg(res.error || "操作失败");
        else {
          setMsg("✅ 已保存");
          after?.();
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
    run(() => createBossAction(fd), () => setNewName(""));
  }

  return (
    <div className="pony-card p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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

      <input
        className="pony-input mb-3 w-full"
        placeholder="🔍 搜索老板名字…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {msg && <p className="mb-2 text-sm text-pony-purpleDeep">{msg}</p>}

      <div className="space-y-2">
        {filtered.map((b) => (
          <BossManagerRow key={b.id} boss={b} pending={pending} run={run} />
        ))}
        {filtered.length === 0 && (
          <p className="py-3 text-sm text-slate-400">没有匹配的老板</p>
        )}
      </div>
    </div>
  );
}

function BossManagerRow({
  boss,
  pending,
  run,
}: {
  boss: BossRow;
  pending: boolean;
  run: (action: () => Promise<Result>, after?: () => void) => void;
}) {
  const [mode, setMode] = useState<null | "rename" | "archive" | "bind">(null);
  const [editName, setEditName] = useState(boss.name);
  const [reason, setReason] = useState("");

  // binding
  const [userQuery, setUserQuery] = useState("");
  const [results, setResults] = useState<BindableUser[]>([]);
  const [searching, setSearching] = useState(false);

  function close() {
    setMode(null);
    setReason("");
    setResults([]);
    setUserQuery("");
  }

  async function searchUsers() {
    setSearching(true);
    try {
      setResults(await fetchBindableUsers(userQuery));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`font-medium ${boss.isActive ? "text-slate-700" : "text-slate-400"}`}>
          {boss.name}
        </span>
        {!boss.isActive && (
          <span className="pony-badge bg-slate-100 text-slate-500">已归档</span>
        )}
        <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
          {trimNum(boss.totalPoints)}分
        </span>
        {boss.boundEmail && (
          <span className="pony-badge bg-pony-sky/30 text-pony-skyDeep">
            👤 {boss.boundEmail}
          </span>
        )}
      </div>

      {!boss.isActive && boss.archiveReason && (
        <p className="mt-1 text-xs text-slate-400">归档原因：{boss.archiveReason}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          className="pony-btn-ghost h-9 min-h-0 px-3 py-1 text-sm"
          onClick={() => {
            setMode(mode === "rename" ? null : "rename");
            setEditName(boss.name);
          }}
        >
          改名
        </button>
        <button
          className="pony-btn-ghost h-9 min-h-0 px-3 py-1 text-sm"
          onClick={() => setMode(mode === "bind" ? null : "bind")}
        >
          {boss.boundEmail ? "改绑/解绑" : "绑定账号"}
        </button>
        {boss.isActive ? (
          <button
            className="pony-btn-ghost h-9 min-h-0 px-3 py-1 text-sm"
            onClick={() => setMode(mode === "archive" ? null : "archive")}
          >
            归档
          </button>
        ) : (
          <button
            className="pony-btn-ghost h-9 min-h-0 px-3 py-1 text-sm"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", boss.id);
              run(() => restoreBossAction(fd));
            }}
          >
            恢复显示
          </button>
        )}
      </div>

      {/* 改名 */}
      {mode === "rename" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="pony-input h-9 min-h-0 flex-1 py-1 text-sm"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <button
            className="pony-btn-primary h-9 min-h-0 px-3 py-1 text-sm"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", boss.id);
              fd.set("name", editName.trim());
              run(() => updateBossAction(fd), close);
            }}
          >
            保存
          </button>
          <button className="pony-btn-ghost h-9 min-h-0 px-3 py-1 text-sm" onClick={close}>
            取消
          </button>
        </div>
      )}

      {/* 归档（必填原因）*/}
      {mode === "archive" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="pony-input h-9 min-h-0 flex-1 py-1 text-sm"
            placeholder="归档原因（必填）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="pony-btn-pink h-9 min-h-0 px-3 py-1 text-sm"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", boss.id);
              fd.set("reason", reason.trim());
              run(() => archiveBossAction(fd), close);
            }}
          >
            确认归档
          </button>
          <button className="pony-btn-ghost h-9 min-h-0 px-3 py-1 text-sm" onClick={close}>
            取消
          </button>
        </div>
      )}

      {/* 绑定账号 */}
      {mode === "bind" && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2">
          {boss.boundEmail && (
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">已绑定：{boss.boundEmail}</span>
              <button
                className="pony-btn-ghost h-8 min-h-0 px-3 py-0 text-xs"
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("bossId", boss.id);
                  run(() => unbindBossUserAction(fd), close);
                }}
              >
                解绑
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              className="pony-input h-9 min-h-0 flex-1 py-1 text-sm"
              placeholder="搜索用户邮箱 / 昵称"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            />
            <button
              className="pony-btn-ghost h-9 min-h-0 px-3 py-1 text-sm"
              onClick={searchUsers}
              disabled={searching}
            >
              {searching ? "搜索中…" : "搜索"}
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {results.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1 text-sm"
              >
                <span className="min-w-0 truncate">
                  {u.email}
                  {u.boundBossName && (
                    <span className="ml-1 text-xs text-rose-400">
                      （已绑 {u.boundBossName}）
                    </span>
                  )}
                </span>
                <button
                  className="pony-btn-primary h-8 min-h-0 px-3 py-0 text-xs"
                  disabled={pending || !!u.boundBossName}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("bossId", boss.id);
                    fd.set("userId", u.id);
                    run(() => bindBossUserAction(fd), close);
                  }}
                >
                  绑定
                </button>
              </li>
            ))}
            {results.length === 0 && userQuery && !searching && (
              <li className="px-2 py-1 text-xs text-slate-400">无匹配用户</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
