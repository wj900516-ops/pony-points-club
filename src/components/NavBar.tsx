import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import NavBarClient from "@/components/NavBarClient";

export default async function NavBar() {
  const user = await getCurrentUser();

  return (
    <NavBarClient
      user={
        user
          ? { displayName: user.displayName, role: user.role }
          : null
      }
      staff={!!user && isStaff(user.role)}
    />
  );
}
