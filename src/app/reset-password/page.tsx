import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { validatePasswordResetTokenForDisplay } from "@/lib/password-reset";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/points");

  const params = await searchParams;
  const token = String(params.token ?? "").trim();
  const tokenCheck = token
    ? await validatePasswordResetTokenForDisplay(token)
    : { ok: false as const, error: "重置链接无效或已过期" };

  return (
    <div className="mx-auto w-full max-w-md px-1">
      <div className="pony-card p-6">
        <h1 className="mb-1 text-2xl font-extrabold text-pony-purpleDeep">
          重置密码
        </h1>
        <p className="mb-5 text-sm text-slate-500">
          设置一个新密码。重置成功后需要重新登录。
        </p>
        {tokenCheck.ok ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {tokenCheck.error}
          </p>
        )}
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-pony-pinkDeep">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
