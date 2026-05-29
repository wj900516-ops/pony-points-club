import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isStaff, isOwner } from "@/lib/permissions";
import BossBoard from "@/components/BossBoard";
import type { BossView } from "@/components/BossCard";

export const dynamic = "force-dynamic";

export default async function PointsPage() {
  const user = await getCurrentUser();
  const staff = !!user && isStaff(user.role);
  const owner = !!user && isOwner(user.role);

  const bosses = await prisma.boss.findMany({
    where: { isActive: true },
    orderBy: [{ totalPoints: "desc" }, { createdAt: "asc" }],
    include: { user: { select: { email: true } } },
  });

  const data: BossView[] = bosses.map((b) => ({
    id: b.id,
    name: b.name,
    totalPoints: b.totalPoints.toString(),
    // 仅 staff 展示绑定信息
    boundLabel: staff && b.user ? b.user.email : null,
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-pony-purpleDeep sm:text-3xl">
          积分榜
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {staff ? "点击「管理」为老板加分、调整或撤销" : "每一次收藏与惊喜，都记录在这里"}
        </p>
      </div>

      <BossBoard bosses={data} isStaff={staff} isOwner={owner} />
    </div>
  );
}
