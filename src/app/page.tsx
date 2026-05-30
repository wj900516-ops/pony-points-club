import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveRewardImageForDisplay } from "@/lib/reward-image-url";
import { trimNum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [rewards, bossCount, pointTiers] = await Promise.all([
    prisma.rewardItem.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.boss.count({ where: { isActive: true, deletedAt: null } }),
    prisma.pointTier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-14 pb-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 px-6 py-12 text-center shadow-pony sm:py-16">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pony-pink/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pony-sky/30 blur-3xl" />
        <p className="mb-3 text-sm font-medium tracking-widest text-pony-purpleDeep/70">
          ✦ PONY POINTS CLUB ✦
        </p>
        <h1 className="text-3xl font-black leading-tight text-slate-800 sm:text-5xl">
          小马积分俱乐部
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-500 sm:text-lg">
          记录每一次收藏、兑换与惊喜
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/points" className="pony-btn-primary w-full px-8 sm:w-auto">
            查看积分榜
          </Link>
          <Link href="/rewards" className="pony-btn-ghost w-full px-8 sm:w-auto">
            浏览兑换商城
          </Link>
        </div>
        {bossCount > 0 && (
          <p className="mt-6 text-xs text-slate-400">
            俱乐部已有 {bossCount} 位收藏玩家在榜
          </p>
        )}
      </section>

      {/* 亮点 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: "🏆", title: "积分榜实时更新", desc: "每次加分、调整都即时反映在榜单上。" },
          { icon: "🎴", title: "卡片 / 卡包兑换", desc: "专属收藏好礼，积分线下兑换展示。" },
          { icon: "🧾", title: "历史积分透明可查", desc: "每一笔流水留痕，可追溯、可撤销。" },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-white/60 bg-white/70 p-5">
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-2 font-bold text-slate-800">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* 兑换预览 */}
      {rewards.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold text-slate-800">兑换展示</h2>
            <Link href="/rewards" className="text-sm font-medium text-pony-purpleDeep hover:underline">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {rewards.map((r) => (
              <div
                key={r.id}
                className="overflow-hidden rounded-2xl border border-pony-purple/15 bg-white shadow-sm"
              >
                <div className="aspect-square overflow-hidden bg-pony-gradient-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveRewardImageForDisplay(r.imageUrl)}
                    alt={r.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-bold text-slate-800">{r.name}</h3>
                  <span className="mt-1 inline-block text-xs font-bold text-pony-purpleDeep">
                    ★ {trimNum(r.pointsRequired.toString())}分
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 积分规则 */}
      <section className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-6">
        <h2 className="text-xl font-bold text-slate-800">积分规则</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {pointTiers.map((t) => (
            <div key={t.id} className="rounded-xl bg-white/80 p-4 text-center">
              <div className="text-lg font-black text-slate-700">{t.label}</div>
              <div className="mt-1 text-sm text-pony-pinkDeep">= {trimNum(t.points.toString())} 分</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">
          特殊活动积分以后台记录为准。
        </p>
      </section>

      {/* 俱乐部说明 */}
      <section className="text-center">
        <h2 className="text-xl font-bold text-slate-800">关于俱乐部</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          这不是一个普通的商城，而是为小马收藏玩家准备的积分记录与兑换展示空间。
          我们用心记录你的每一次收藏，让每一分都清晰可查、值得纪念。
        </p>
      </section>
    </div>
  );
}
