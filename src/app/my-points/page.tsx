import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import BossCard, { type BossView } from "@/components/BossCard";

export const dynamic = "force-dynamic";

export default async function MyPointsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 找到绑定到当前账号的积分档案
  const boss = await prisma.boss.findUnique({ where: { userId: user.id } });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-pony-purpleDeep sm:text-3xl">
          我的积分
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          你好，{user.displayName}
        </p>
      </div>

      {!boss ? (
        <div className="pony-card p-8 text-center">
          <p className="text-slate-500">你的账号还没有绑定积分档案。</p>
          <p className="mt-1 text-sm text-slate-400">
            请联系俱乐部管理员为你绑定后即可查看积分与历史。
          </p>
          <Link href="/rewards" className="pony-btn-ghost mt-4 inline-flex">
            先去看看兑换商城 →
          </Link>
        </div>
      ) : (
        <div className="max-w-md">
          <BossCard
            boss={
              {
                id: boss.id,
                name: boss.name,
                totalPoints: boss.totalPoints.toString(),
              } satisfies BossView
            }
            isStaff={false}
          />
          <p className="mt-3 text-center text-xs text-slate-400">
            如需兑换商品，请联系俱乐部管理员在后台为你操作。
          </p>
        </div>
      )}
    </div>
  );
}
