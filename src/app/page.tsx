import { redirect } from "next/navigation";

// 首页直接进入积分榜
export default function Home() {
  redirect("/points");
}
