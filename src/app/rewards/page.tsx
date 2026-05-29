import { prisma } from "@/lib/prisma";
import { resolveRewardImageForDisplay } from "@/lib/reward-image-url";
import RewardGallery, { type RewardView } from "@/components/RewardGallery";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  // 公开仅展示已上架(active)商品；前台只展示，不提供兑换按钮（兑换由后台操作）
  const items = await prisma.rewardItem.findMany({
    where: { isActive: true },
    orderBy: { pointsRequired: "asc" },
  });

  const data: RewardView[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    image: resolveRewardImageForDisplay(item.imageUrl),
    pointsRequired: item.pointsRequired.toString(),
    stock: item.stock,
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-pony-pinkDeep sm:text-3xl">
          兑换展示
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          收藏好礼线下兑换 · 积分由俱乐部后台为你结算
        </p>
      </div>

      {data.length === 0 ? (
        <div className="pony-card p-8 text-center text-slate-400">
          暂无可兑换商品 ✨
        </div>
      ) : (
        <RewardGallery items={data} />
      )}
    </div>
  );
}
