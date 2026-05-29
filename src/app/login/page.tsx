import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/points");

  return (
    <div className="mx-auto w-full max-w-md px-1">
      <div className="pony-card p-6">
        <h1 className="mb-1 text-2xl font-extrabold text-pony-purpleDeep">
          欢迎回来 ✨
        </h1>
        <p className="mb-5 text-sm text-slate-500">登录以查看与管理积分</p>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          还没有账号？{" "}
          <Link href="/register" className="font-medium text-pony-pinkDeep">
            去注册
          </Link>
        </p>
      </div>
    </div>
  );
}
