import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import NavBarClient from "@/components/NavBarClient";

export default async function NavBar() {
  const user = await getCurrentUser();
  const staff = !!user && isStaff(user.role);

  // 非员工但绑定了积分档案的用户，显示「我的积分」入口
  let hasBoundBoss = false;
  if (user && !staff) {
    const boss = await prisma.boss.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    hasBoundBoss = !!boss;
  }

  return (
    <NavBarClient
      user={
        user ? { displayName: user.displayName, role: user.role } : null
      }
      staff={staff}
      hasBoundBoss={hasBoundBoss}
    />
  );
}
