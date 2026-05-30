import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/points");

  const params = await searchParams;
  const passwordReset = params.reset === "1";

  return (
    <div className="mx-auto w-full max-w-md px-1">
      <div className="pony-card p-6">
        <h1 className="mb-1 text-2xl font-extrabold text-pony-purpleDeep">
          欢迎回来
        </h1>
        <p className="mb-5 text-sm text-slate-500">登录以查看与管理积分</p>
        {passwordReset && (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            密码已更新，请重新登录。
          </p>
        )}
        <LoginForm />
        <div className="mt-4 flex flex-col gap-2 text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="font-medium text-pony-pinkDeep">
            忘记密码？
          </Link>
          <p>
            还没有账号？{" "}
            <Link href="/register" className="font-medium text-pony-pinkDeep">
              去注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
