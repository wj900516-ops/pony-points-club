export default function NotFound() {
  return (
    <div className="pony-card mx-auto max-w-md p-8 text-center">
      <p className="text-4xl">🦄</p>
      <h1 className="mt-3 text-xl font-bold text-pony-purpleDeep">页面不存在</h1>
      <p className="mt-2 text-sm text-slate-500">404 — 找不到你要访问的页面</p>
      <a href="/points" className="pony-btn-primary mt-6 inline-flex">
        返回积分榜
      </a>
    </div>
  );
}
