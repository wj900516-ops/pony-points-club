import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isStaff, isOwner } from "@/lib/permissions";
import { fetchAuditLogs } from "@/app/actions/users";
import { fetchRedemptions } from "@/app/actions/redemptions";
import BossManager from "@/components/admin/BossManager";
import RewardManager from "@/components/admin/RewardManager";
import UserManager from "@/components/admin/UserManager";
import RedemptionManager from "@/components/admin/RedemptionManager";
import AuditLogPanel from "@/components/admin/AuditLogPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  // 后端守卫：非 staff 一律踢回。前端隐藏只是辅助。
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/points");

  const owner = isOwner(user.role);

  const [bosses, rewards, users, redemptions, auditLogs] = await Promise.all([
    prisma.boss.findMany({
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true } } },
    }),
    prisma.rewardItem.findMany({ orderBy: { createdAt: "desc" } }),
    owner
      ? prisma.user.findMany({ orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    fetchRedemptions(),
    fetchAuditLogs(),
  ]);

  const bossData = bosses.map((b) => ({
    id: b.id,
    name: b.name,
    totalPoints: b.totalPoints.toString(),
    isActive: b.isActive,
    boundEmail: b.user?.email ?? null,
    archiveReason: b.archiveReason ?? null,
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

  // 兑换管理用：活跃老板 + 上架商品
  const activeBosses = bossData
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name, totalPoints: b.totalPoints }));
  const activeRewards = rewardData
    .filter((r) => r.isActive)
    .map((r) => ({
      id: r.id,
      name: r.name,
      pointsRequired: r.pointsRequired,
      stock: r.stock,
    }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-pony-purpleDeep">
          后台管理
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

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-700">🔄 兑换管理</h2>
        <RedemptionManager
          bosses={activeBosses}
          rewards={activeRewards}
          redemptions={redemptions}
        />
      </section>

      {owner && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-700">👥 用户管理</h2>
          <UserManager users={userData} currentUserId={user.id} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-700">📋 最近操作记录</h2>
        <AuditLogPanel logs={auditLogs} />
      </section>
    </div>
  );
}
