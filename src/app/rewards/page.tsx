import { prisma } from "@/lib/prisma";
import { trimNum } from "@/lib/format";
import { resolveRewardImageForDisplay } from "@/lib/reward-image-url";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  // 公开仅展示已上架(active)商品
  const items = await prisma.rewardItem.findMany({
    where: { isActive: true },
    orderBy: { pointsRequired: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-pony-pinkDeep">
          🎁 兑换商城
        </h1>
        <p className="text-sm text-slate-500">用积分兑换专属周边（线下兑换）</p>
      </div>

      {items.length === 0 ? (
        <div className="pony-card p-8 text-center text-slate-400">
          暂无可兑换商品 ✨
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="pony-card overflow-hidden">
              <div className="flex aspect-[4/3] items-center justify-center bg-pony-gradient-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveRewardImageForDisplay(item.imageUrl)}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-800">{item.name}</h3>
                  <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
                    {trimNum(item.pointsRequired.toString())}分
                  </span>
                </div>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {item.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  库存：{item.stock > 0 ? item.stock : "已兑完"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
