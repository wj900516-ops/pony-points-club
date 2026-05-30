import "server-only";

export type SendPasswordResetEmailInput = {
  to: string;
  resetLink: string;
};

export type EmailResult =
  | { ok: true }
  | { ok: false; error: string };

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "小马积分俱乐部 <noreply@xiaolinmlp.com>";

  if (!apiKey) {
    if (!isProduction()) {
      console.log(`[password-reset] reset link for ${input.to}: ${input.resetLink}`);
      return { ok: true };
    }
    return { ok: false, error: "邮件服务未配置，请联系管理员" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: "小马积分俱乐部 - 重置密码",
        text: [
          "你正在请求重置密码。",
          "请点击下面链接设置新密码：",
          input.resetLink,
          "",
          "如果不是你本人操作，可以忽略这封邮件。",
        ].join("\n"),
      }),
    });

    if (!res.ok) {
      return { ok: false, error: "邮件发送失败，请稍后重试" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "邮件发送失败，请稍后重试" };
  }
}
