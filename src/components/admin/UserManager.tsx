"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRoleAction } from "@/app/actions/users";

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  role: "OWNER" | "ADMIN" | "VIEWER";
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "主理人",
  ADMIN: "员工",
  VIEWER: "访客",
};

export default function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function setRole(userId: string, role: "ADMIN" | "VIEWER") {
    setMsg(null);
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", role);
    startTransition(async () => {
      try {
        const res = await updateUserRoleAction(fd);
        if (!res.ok) setMsg(res.error || "操作失败");
        else {
          setMsg("✅ 角色已更新，对方刷新页面后即可生效（无需重新登录）");
          router.refresh();
        }
      } catch {
        setMsg("网络异常，请稍后重试");
      }
    });
  }

  return (
    <div className="pony-card p-4">
      {msg && <p className="mb-2 text-sm text-pony-purpleDeep">{msg}</p>}

      {/* 手机 / 小屏：卡片式 */}
      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            currentUserId={currentUserId}
            pending={pending}
            onSetRole={setRole}
          />
        ))}
      </div>

      {/* 桌面 / iPad 横屏：表格 */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-base">
          <thead>
            <tr className="text-slate-400">
              <th className="py-2 pr-4">昵称</th>
              <th className="py-2 pr-4">邮箱</th>
              <th className="py-2 pr-4">角色</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <UserTableRow
                key={u.id}
                user={u}
                currentUserId={currentUserId}
                pending={pending}
                onSetRole={setRole}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        说明：owner 角色只能由数据库手动设置，后台不提供「升为 owner」操作，以防越权。
      </p>
    </div>
  );
}

function UserActions({
  user,
  currentUserId,
  pending,
  onSetRole,
}: {
  user: UserRow;
  currentUserId: string;
  pending: boolean;
  onSetRole: (userId: string, role: "ADMIN" | "VIEWER") => void;
}) {
  const self = user.id === currentUserId;
  const isOwnerRow = user.role === "OWNER";

  if (isOwnerRow || self) {
    return <span className="text-xs text-slate-300">不可修改</span>;
  }
  if (user.role === "VIEWER") {
    return (
      <button
        className="pony-btn-primary w-full sm:w-auto"
        disabled={pending}
        onClick={() => onSetRole(user.id, "ADMIN")}
      >
        设为员工
      </button>
    );
  }
  return (
    <button
      className="pony-btn-ghost w-full sm:w-auto"
      disabled={pending}
      onClick={() => onSetRole(user.id, "VIEWER")}
    >
      降为访客
    </button>
  );
}

function UserCard({
  user,
  currentUserId,
  pending,
  onSetRole,
}: {
  user: UserRow;
  currentUserId: string;
  pending: boolean;
  onSetRole: (userId: string, role: "ADMIN" | "VIEWER") => void;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-700">
          {user.displayName}
          {user.id === currentUserId && (
            <span className="ml-1 text-xs text-slate-400">(我)</span>
          )}
        </span>
        <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
          {ROLE_LABEL[user.role]}
        </span>
      </div>
      <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
      <div className="mt-3">
        <UserActions
          user={user}
          currentUserId={currentUserId}
          pending={pending}
          onSetRole={onSetRole}
        />
      </div>
    </div>
  );
}

function UserTableRow({
  user,
  currentUserId,
  pending,
  onSetRole,
}: {
  user: UserRow;
  currentUserId: string;
  pending: boolean;
  onSetRole: (userId: string, role: "ADMIN" | "VIEWER") => void;
}) {
  return (
    <tr>
      <td className="py-2 pr-4 font-medium text-slate-700">
        {user.displayName}
        {user.id === currentUserId && (
          <span className="ml-1 text-xs text-slate-400">(我)</span>
        )}
      </td>
      <td className="break-all py-2 pr-4 text-slate-500">{user.email}</td>
      <td className="py-2 pr-4">
        <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
          {ROLE_LABEL[user.role]}
        </span>
      </td>
      <td className="py-2">
        <UserActions
          user={user}
          currentUserId={currentUserId}
          pending={pending}
          onSetRole={onSetRole}
        />
      </td>
    </tr>
  );
}
