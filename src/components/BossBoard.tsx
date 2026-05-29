"use client";

import { useMemo, useState } from "react";
import BossCard, { type BossView } from "@/components/BossCard";

export default function BossBoard({
  bosses,
  isStaff,
  isOwner,
}: {
  bosses: BossView[];
  isStaff: boolean;
  isOwner: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bosses;
    return bosses.filter((b) => b.name.toLowerCase().includes(q));
  }, [bosses, query]);

  return (
    <div>
      <div className="mb-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 搜索老板名字…"
          className="pony-input w-full"
          aria-label="搜索老板名字"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="pony-card p-8 text-center text-slate-400">
          {bosses.length === 0
            ? "还没有老板，请到后台添加 🐎"
            : `没有找到包含「${query}」的老板`}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((boss) => (
            <BossCard
              key={boss.id}
              boss={boss}
              isStaff={isStaff}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}
    </div>
  );
}
