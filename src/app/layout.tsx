import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Pony Points Club · 小马积分俱乐部",
  description: "小马宝莉主题积分系统：积分榜、积分历史、兑换商城。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#a78bfa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <NavBar />
        <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-slate-400 sm:py-8">
          🦄 Pony Points Club · 仅供俱乐部内部使用
        </footer>
      </body>
    </html>
  );
}
