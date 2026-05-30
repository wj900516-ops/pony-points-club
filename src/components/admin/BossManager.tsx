"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { trimNum } from "@/lib/format";
import {
  archiveBossAction,
  bindBossUserAction,
  createBossAction,
  deleteBossAction,
  restoreBossAction,
  unbindBossUserAction,
  updateBossAction,
} from "@/app/actions/bosses";
import { fetchBindableUsers, type BindableUser } from "@/app/actions/users";

interface BossRow {
  id: string;
  name: string;
  totalPoints: string;
  isActive: boolean;
  boundEmail: string | null;
  archiveReason: string | null;
  deletedAt: string | null;
  deleteReason: string | null;
}

type Result = { ok: boolean; error?: string };
type Mode = null | "rename" | "archive" | "delete" | "bind";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "主理人",
  ADMIN: "员工",
  VIEWER: "访客",
};

export default function BossManager({ bosses }: { bosses: BossRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bosses;
    return bosses.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.boundEmail?.toLowerCase().includes(q)
    );
  }, [bosses, query]);

  function run(action: () => Promise<Result>, after?: () => void) {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.ok) setMsg(res.error || "操作失败");
        else {
          setMsg("已保存");
          after?.();
          router.refresh();
        }
      } catch {
        setMsg("网络异常，请稍后重试");
      }
    });
  }

  function add() {
    if (!newName.trim()) {
      setMsg("请填写老板名字");
      return;
    }
    const fd = new FormData();
    fd.set("name", newName.trim());
    fd.set("note", newNote.trim());
    run(() => createBossAction(fd), () => {
      setNewName("");
      setNewNote("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="pony-card p-4">
        <h3 className="mb-3 text-base font-bold text-slate-700">添加老板</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            className="pony-input"
            placeholder="输入老板名字"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="pony-input"
            placeholder="备注（可选，请确认是否重复）"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button
            type="button"
            className="pony-btn-primary min-h-[44px] w-full md:w-auto"
            onClick={add}
            disabled={pending}
          >
            添加老板
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-pony-purpleDeep">{msg}</p>}
      </div>

      <div className="pony-card p-4">
        <input
          className="pony-input mb-3 w-full"
          placeholder="搜索老板名字或绑定账号"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="space-y-3">
          {filtered.map((b) => (
            <BossManagerRow key={b.id} boss={b} pending={pending} run={run} />
          ))}
          {filtered.length === 0 && (
            <p className="py-3 text-sm text-slate-400">没有匹配的老板</p>
          )}
        </div>
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
  const [mode, setMode] = useState<Mode>(null);
  const [editName, setEditName] = useState(boss.name);
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [results, setResults] = useState<BindableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const deleted = !!boss.deletedAt;

  function close() {
    setMode(null);
    setReason("");
    setConfirmDelete(false);
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
    <div className="rounded-xl border border-slate-100 bg-white/70 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-medium ${deleted ? "text-slate-400" : "text-slate-700"}`}>
              {boss.name}
            </span>
            <StatusBadge boss={boss} />
            <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
              {trimNum(boss.totalPoints)}分
            </span>
          </div>
          {boss.boundEmail && (
            <p className="mt-1 break-all text-xs text-slate-500">
              已绑定账号：{boss.boundEmail}
            </p>
          )}
          {!boss.isActive && boss.archiveReason && !deleted && (
            <p className="mt-1 text-xs text-slate-400">归档原因：{boss.archiveReason}</p>
          )}
          {deleted && boss.deleteReason && (
            <p className="mt-1 text-xs text-rose-500">删除原因：{boss.deleteReason}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!deleted && (
          <>
            <SmallButton onClick={() => setMode(mode === "rename" ? null : "rename")}>
              修改名字
            </SmallButton>
            <SmallButton onClick={() => setMode(mode === "bind" ? null : "bind")}>
              {boss.boundEmail ? "绑定 / 解绑账号" : "绑定账号"}
            </SmallButton>
            {boss.isActive ? (
              <SmallButton onClick={() => setMode(mode === "archive" ? null : "archive")}>
                归档
              </SmallButton>
            ) : (
              <SmallButton
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("id", boss.id);
                  run(() => restoreBossAction(fd));
                }}
              >
                恢复
              </SmallButton>
            )}
            <button
              type="button"
              className="min-h-[40px] rounded-full bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              disabled={pending}
              onClick={() => setMode(mode === "delete" ? null : "delete")}
            >
              删除
            </button>
          </>
        )}
        {deleted && (
          <SmallButton
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", boss.id);
              run(() => restoreBossAction(fd));
            }}
          >
            恢复
          </SmallButton>
        )}
      </div>

      {mode === "rename" && !deleted && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="pony-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <SmallButton
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", boss.id);
              fd.set("name", editName.trim());
              run(() => updateBossAction(fd), close);
            }}
          >
            保存
          </SmallButton>
          <SmallButton onClick={close}>取消</SmallButton>
        </div>
      )}

      {mode === "archive" && !deleted && (
        <ReasonPanel
          placeholder="归档原因（必填）"
          reason={reason}
          pending={pending}
          confirmLabel="确认归档"
          onReason={setReason}
          onCancel={close}
          onConfirm={() => {
            const fd = new FormData();
            fd.set("id", boss.id);
            fd.set("reason", reason.trim());
            run(() => archiveBossAction(fd), close);
          }}
        />
      )}

      {mode === "delete" && !deleted && (
        <div className="mt-3 rounded-lg bg-rose-50 p-3">
          <p className="mb-2 text-sm font-medium text-rose-700">
            删除是软删除，会停用该老板但保留积分历史和审计记录。
          </p>
          <input
            className="pony-input"
            placeholder="删除原因（必填）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-rose-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
            />
            我确认要删除该老板
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="min-h-[40px] rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={pending || !confirmDelete}
              onClick={() => {
                const fd = new FormData();
                fd.set("id", boss.id);
                fd.set("reason", reason.trim());
                run(() => deleteBossAction(fd), close);
              }}
            >
              确认删除
            </button>
            <SmallButton onClick={close}>取消</SmallButton>
          </div>
        </div>
      )}

      {mode === "bind" && !deleted && (
        <div className="mt-3 rounded-lg bg-slate-50 p-2">
          {boss.boundEmail && (
            <div className="mb-2 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="break-all text-slate-500">已绑定：{boss.boundEmail}</span>
              <SmallButton
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("bossId", boss.id);
                  run(() => unbindBossUserAction(fd), close);
                }}
              >
                解绑
              </SmallButton>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="pony-input"
              placeholder="搜索用户邮箱 / 昵称"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
            <SmallButton onClick={searchUsers} disabled={searching}>
              {searching ? "搜索中..." : "搜索"}
            </SmallButton>
          </div>
          <ul className="mt-2 space-y-1">
            {results.map((u) => {
              const boundElsewhere = u.boundBossName && u.boundBossName !== boss.name;
              const boundHere = u.boundBossName === boss.name;
              return (
                <li key={u.id} className="rounded-md bg-white px-2 py-2 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-medium text-slate-700">{u.email}</p>
                      <p className="text-xs text-slate-500">
                        {u.displayName} · {ROLE_LABEL[u.role] ?? u.role}
                        {boundElsewhere ? ` · 已绑定「${u.boundBossName}」` : ""}
                        {boundHere ? " · 已绑定本老板" : ""}
                      </p>
                    </div>
                    <SmallButton
                      disabled={pending || !!boundElsewhere || boundHere}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("bossId", boss.id);
                        fd.set("userId", u.id);
                        run(() => bindBossUserAction(fd), close);
                      }}
                    >
                      绑定
                    </SmallButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ boss }: { boss: BossRow }) {
  if (boss.deletedAt) {
    return <span className="pony-badge bg-rose-100 text-rose-600">已删除</span>;
  }
  if (!boss.isActive) {
    return <span className="pony-badge bg-slate-100 text-slate-500">已归档</span>;
  }
  return <span className="pony-badge bg-emerald-100 text-emerald-600">正常</span>;
}

function SmallButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="pony-btn-ghost min-h-[40px] w-full px-3 py-2 text-sm sm:w-auto"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ReasonPanel({
  placeholder,
  reason,
  pending,
  confirmLabel,
  onReason,
  onConfirm,
  onCancel,
}: {
  placeholder: string;
  reason: string;
  pending: boolean;
  confirmLabel: string;
  onReason: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input
        className="pony-input"
        placeholder={placeholder}
        value={reason}
        onChange={(e) => onReason(e.target.value)}
      />
      <SmallButton disabled={pending} onClick={onConfirm}>
        {confirmLabel}
      </SmallButton>
      <SmallButton onClick={onCancel}>取消</SmallButton>
    </div>
  );
}
