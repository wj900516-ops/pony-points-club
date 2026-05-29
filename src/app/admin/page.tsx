import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isStaff, isOwner } from "@/lib/permissions";
import BossManager from "@/components/admin/BossManager";
import RewardManager from "@/components/admin/RewardManager";
import UserManager from "@/components/admin/UserManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  // 后端守卫：非 staff 一律踢回。前端隐藏只是辅助。
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/points");

  const owner = isOwner(user.role);

  const [bosses, rewards, users] = await Promise.all([
    prisma.boss.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.rewardItem.findMany({ orderBy: { createdAt: "desc" } }),
    owner
      ? prisma.user.findMany({ orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
  ]);

  const bossData = bosses.map((b) => ({
    id: b.id,
    name: b.name,
    totalPoints: b.totalPoints.toString(),
    isActive: b.isActive,
  }));

  const rewardData = rewards.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    imageUrl: r.imageUrl ?? "",
    pointsRequired: r.pointsRequired.toString(),
    stock: r.stock,
    isActive: r.isActive,
  }));

  const userData = users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-pony-purpleDeep">
          🛠️ 后台管理
        </h1>
        <p className="text-sm text-slate-500">
          当前身份：{user.displayName}（{owner ? "主理人 owner" : "员工 admin"}）
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-700">🐎 老板管理</h2>
        <BossManager bosses={bossData} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-700">🎁 商品管理</h2>
        <RewardManager rewards={rewardData} />
      </section>

      {owner && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-700">👥 用户管理</h2>
          <UserManager users={userData} currentUserId={user.id} />
        </section>
      )}
    </div>
  );
}
