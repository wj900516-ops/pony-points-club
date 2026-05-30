import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/points");
  const resetUnavailable = !process.env.RESEND_API_KEY;

  return (
    <div className="mx-auto w-full max-w-md px-1">
      <div className="pony-card p-6">
        <h1 className="mb-1 text-2xl font-extrabold text-pony-purpleDeep">
          找回密码
        </h1>
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          密码重置功能暂未开放，请联系管理员重置密码。
        </p>
        <p className="mb-5 text-sm text-slate-500">
          {resetUnavailable
            ? "当前邮件服务未配置，暂时不会发送重置密码邮件。"
            : "输入注册邮箱，我们会发送重置密码链接。"}
        </p>
        {!resetUnavailable && <ForgotPasswordForm />}
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-pony-pinkDeep">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
