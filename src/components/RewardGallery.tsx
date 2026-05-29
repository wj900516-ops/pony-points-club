"use client";

import { useEffect, useState } from "react";
import { trimNum } from "@/lib/format";

export interface RewardView {
  id: string;
  name: string;
  description: string;
  image: string;
  pointsRequired: string;
  stock: number;
}

type ViewMode = "big" | "two" | "four";
const STORAGE_KEY = "ppc_rewards_view";

const GRID: Record<ViewMode, string> = {
  big: "grid-cols-1 max-w-md mx-auto",
  two: "grid-cols-2",
  four: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

function defaultMode(): ViewMode {
  if (typeof window === "undefined") return "two";
  const w = window.innerWidth;
  if (w < 640) return "big";
  if (w < 1024) return "two";
  return "four";
}

export default function RewardGallery({ items }: { items: RewardView[] }) {
  const [mode, setMode] = useState<ViewMode>("two");

  // 读取 localStorage 或按设备宽度给默认值
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    setMode(saved === "big" || saved === "two" || saved === "four" ? saved : defaultMode());
  }, []);

  function choose(m: ViewMode) {
    setMode(m);
    window.localStorage.setItem(STORAGE_KEY, m);
  }

  const tabs: { key: ViewMode; label: string }[] = [
    { key: "big", label: "大图" },
    { key: "two", label: "两列" },
    { key: "four", label: "四列" },
  ];

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <div className="inline-flex overflow-hidden rounded-full bg-white/70 p-1 ring-1 ring-pony-purple/20">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => choose(t.key)}
              className={`min-h-[40px] rounded-full px-4 text-sm font-medium transition ${
                mode === t.key
                  ? "bg-pony-purpleDeep text-white shadow-pony"
                  : "text-slate-500 hover:text-pony-purpleDeep"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${GRID[mode]}`}>
        {items.map((item) => (
          <article
            key={item.id}
            className="group overflow-hidden rounded-2xl border border-pony-purple/15 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-pony"
          >
            <div className="relative aspect-square overflow-hidden bg-pony-gradient-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-pony-purpleDeep shadow-sm ring-1 ring-amber-200">
                ★ {trimNum(item.pointsRequired)}分
              </span>
            </div>
            <div className="p-3">
              <h3 className={`font-bold text-slate-800 ${mode === "four" ? "text-sm" : "text-base"}`}>
                {item.name}
              </h3>
              {item.description && mode !== "four" && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {item.description}
                </p>
              )}
              <div className="mt-2">
                {item.stock > 0 ? (
                  <span className="pony-badge bg-emerald-50 text-emerald-600">
                    库存 {item.stock}
                  </span>
                ) : (
                  <span className="pony-badge bg-slate-100 text-slate-400">
                    已兑完
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
