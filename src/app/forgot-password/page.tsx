import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/points");

  return (
    <div className="mx-auto w-full max-w-md px-1">
      <div className="pony-card p-6">
        <h1 className="mb-1 text-2xl font-extrabold text-pony-purpleDeep">
          找回密码
        </h1>
        <p className="mb-5 text-sm text-slate-500">
          输入注册邮箱，我们会发送重置密码链接。
        </p>
        <ForgotPasswordForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-pony-pinkDeep">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
