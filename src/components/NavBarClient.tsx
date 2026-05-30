"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

export type NavUser = {
  displayName: string;
  role: string;
};

export default function NavBarClient({
  user,
  staff,
  showMyPoints = false,
}: {
  user: NavUser | null;
  staff: boolean;
  showMyPoints?: boolean;
}) {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  const links = (
    <>
      <Link href="/" className="pony-btn-ghost w-full sm:w-auto" onClick={closeMenu}>
        首页
      </Link>
      <Link href="/points" className="pony-btn-ghost w-full sm:w-auto" onClick={closeMenu}>
        积分榜
      </Link>
      <Link href="/rewards" className="pony-btn-ghost w-full sm:w-auto" onClick={closeMenu}>
        兑换展示
      </Link>
      {showMyPoints && (
        <Link href="/my-points" className="pony-btn-ghost w-full sm:w-auto" onClick={closeMenu}>
          我的积分
        </Link>
      )}
      {staff && (
        <Link href="/admin" className="pony-btn-ghost w-full sm:w-auto" onClick={closeMenu}>
          后台
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/50 bg-white/70 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="text-xl shrink-0">🌈</span>
            <span className="truncate bg-pony-gradient bg-clip-text text-base font-extrabold text-transparent sm:text-lg">
              Pony Points Club
            </span>
          </Link>

          <button
            type="button"
            className="pony-btn-ghost min-w-[44px] px-3 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "关闭" : "菜单"}
          </button>

          <div className="hidden items-center gap-2 text-sm md:flex">
            {links}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline text-slate-500">
                  {user.displayName}
                  <RoleTag role={user.role} />
                </span>
                <form action={logoutAction}>
                  <button className="pony-btn-ghost" type="submit">
                    退出
                  </button>
                </form>
              </div>
            ) : (
              <>
                <Link href="/register" className="pony-btn-ghost">
                  注册
                </Link>
                <Link href="/login" className="pony-btn-primary">
                  登录
                </Link>
              </>
            )}
          </div>
        </div>

        {open && (
          <div
            id="mobile-nav"
            className="mt-3 flex flex-col gap-2 border-t border-white/60 pt-3 md:hidden"
          >
            {links}
            {user ? (
              <>
                <p className="px-2 text-sm text-slate-500">
                  {user.displayName}
                  <RoleTag role={user.role} />
                </p>
                <form action={logoutAction}>
                  <button className="pony-btn-ghost w-full" type="submit">
                    退出
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/register" className="pony-btn-ghost w-full" onClick={closeMenu}>
                  注册
                </Link>
                <Link href="/login" className="pony-btn-primary w-full" onClick={closeMenu}>
                  登录
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

function RoleTag({ role }: { role: string }) {
  const map: Record<string, { text: string; cls: string }> = {
    OWNER: { text: "主理人", cls: "bg-pony-purpleDeep text-white" },
    ADMIN: { text: "员工", cls: "bg-pony-skyDeep text-white" },
    VIEWER: { text: "访客", cls: "bg-slate-200 text-slate-600" },
  };
  const tag = map[role] ?? map.VIEWER;
  return <span className={`pony-badge ml-2 ${tag.cls}`}>{tag.text}</span>;
}
