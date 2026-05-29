import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import BossCard, { type BossView } from "@/components/BossCard";

export const dynamic = "force-dynamic";

export default async function PointsPage() {
  const user = await getCurrentUser();
  const staff = !!user && isStaff(user.role);

  const bosses = await prisma.boss.findMany({
    where: { isActive: true },
    orderBy: [{ totalPoints: "desc" }, { createdAt: "asc" }],
  });

  const data: BossView[] = bosses.map((b) => ({
    id: b.id,
    name: b.name,
    totalPoints: b.totalPoints.toString(),
  }));

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-pony-purpleDeep">
            ⭐ 积分榜
          </h1>
          <p className="text-sm text-slate-500">
            {staff
              ? "你可以点击「管理」为老板加分"
              : "实时展示各位老板的累计积分"}
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="pony-card p-8 text-center text-slate-400">
          还没有老板，请到后台添加 🐎
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((boss) => (
            <BossCard key={boss.id} boss={boss} isStaff={staff} />
          ))}
        </div>
      )}
    </div>
  );
}
