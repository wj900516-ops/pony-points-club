import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/points");

  return (
    <div className="mx-auto w-full max-w-md px-1">
      <div className="pony-card p-6">
        <h1 className="mb-1 text-2xl font-extrabold text-pony-purpleDeep">
          加入俱乐部 🦄
        </h1>
        <p className="mb-5 text-sm text-slate-500">
          注册后默认是访客，可浏览积分榜与商城
        </p>
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          已有账号？{" "}
          <Link href="/login" className="font-medium text-pony-pinkDeep">
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
}
