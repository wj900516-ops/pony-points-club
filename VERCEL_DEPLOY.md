# Vercel + Supabase 部署指南

Pony Points Club 推荐部署架构：

| 组件 | 服务 |
|---|---|
| 前端 / API | **Vercel** |
| 数据库 | **Supabase Postgres**（Prisma + `DATABASE_URL`） |
| 商品图片 | **Supabase Storage**（bucket: `reward-images`） |
| 登录 | **自建**邮箱密码 + JWT Cookie（**不用 Supabase Auth**） |

---

## 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) → New Project。
2. 选择区域（离用户近；**大陆访问不保证稳定**，见文末说明）。
3. 设置数据库密码并等待项目就绪。

---

## 2. 获取 Supabase Postgres 连接串（`DATABASE_URL` + `DIRECT_URL`）

Prisma `schema.prisma` 已配置：

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // 应用运行时（Vercel）
  directUrl = env("DIRECT_URL")     // prisma migrate deploy
}
```

### `DATABASE_URL` — Transaction pooler（Vercel 运行时）

1. Supabase Dashboard → **Project Settings** → **Database**。
2. **Connection string** → **URI** → **Transaction pooler**（端口 **6543**）：
   ```
   postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
3. 填入 Vercel **`DATABASE_URL`**（Next.js / Prisma Client 查询用）。

### `DIRECT_URL` — Session pooler / Direct（迁移用）

1. 同一页面 → **Session pooler** 或 **Direct connection**（端口 **5432**）：
   ```
   postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
2. **不要**加 `?pgbouncer=true`（migrate 需要 Session 模式）。
3. 填入 Vercel **`DIRECT_URL`**，并在**本地**执行 migrate 时同样配置。

> **为何需要两个 URL？**  
> Vercel Serverless 经 **Transaction pooler** 复用连接；`prisma migrate deploy` 需要 **Session/Direct** 连接执行 DDL，不能走 Transaction pooler。

**首次建表（本地或 CI）：**

```bash
# .env 中同时设置 DATABASE_URL（6543）与 DIRECT_URL（5432）
npx prisma migrate deploy
npm run db:seed   # 首次；生产请设强密码 SEED_OWNER_PASSWORD
```

---

## 3. 创建 Supabase Storage Bucket

1. Dashboard → **Storage** → **New bucket**。
2. 名称：**`reward-images`**（与 `SUPABASE_STORAGE_BUCKET` 一致）。
3. **Public bucket**：开启（MVP 推荐，/rewards 可直接 `<img src>` 展示）。
4. 可选：在 Policies 中允许 service role 上传（使用 `SUPABASE_SERVICE_ROLE_KEY` 的服务端上传默认可写）。

上传后 URL 形如：

```
https://[project-ref].supabase.co/storage/v1/object/public/reward-images/reward-1730123456789-abc.jpg
```

---

## 4. 获取 Supabase API 密钥

Project Settings → **API**：

| 变量 | 来源 |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** secret（仅服务端，勿暴露到前端） |

> 我们**只**用 Supabase 的 Postgres + Storage，**不启用 Supabase Auth**。

---

## 5. 为什么不使用 Supabase Auth？

- 项目已有一套 **自建邮箱 + bcrypt + JWT Cookie** 登录，权限与 `OWNER` / `ADMIN` / `VIEWER` 角色已落地。
- 切换 Supabase Auth 会引入 Google/OAuth 依赖与迁移成本，且与现有 Prisma `User` 表重复。
- Supabase 在此方案中仅是 **托管 Postgres + 对象存储**，认证逻辑仍 100% 在本项目代码中（`src/lib/auth.ts`）。

---

## 6. Vercel 部署步骤

### 6.1 推送代码

将仓库连接到 Vercel（GitHub / GitLab 等）。

### 6.2 Vercel 项目设置（解决平台 404 NOT_FOUND）

在 Vercel → Project → **Settings** → **General** / **Build & Development Settings**：

| 设置项 | 正确值 | 常见错误 |
|---|---|---|
| **Framework Preset** | `Next.js` | 选 Other / Static |
| **Root Directory** | **留空**（仓库根目录） | 填 `src`、`app`、子文件夹 |
| **Build Command** | `npm run build` | 空白或 `next export` |
| **Output Directory** | **留空**（默认，由 Vercel 处理） | 填 `.next`、`out`、`public` → **会导致全站 404** |
| **Install Command** | `npm ci` 或留空 | — |

> 本仓库结构：根目录含 `package.json`、`next.config.mjs`、`src/app/`、`prisma/`、`public/`。  
> **Root Directory 必须为仓库根**，不要指向 `src`。

**不要**设置环境变量 `NODE_ENV=development`（见第 11 节）。

### 6.3 配置环境变量

Vercel Project → **Settings** → **Environment Variables**：

| 变量 | 值 | 说明 |
|---|---|---|
| `DATABASE_URL` | Supabase **Transaction** pooler（`:6543?pgbouncer=true`） | Vercel 运行时查询 |
| `DIRECT_URL` | Supabase **Session** pooler / Direct（`:5432`） | `prisma migrate deploy` |
| `AUTH_SECRET` | `openssl rand -base64 48` | ≥32 字符 |
| `AUTH_COOKIE_SECURE` | `true` | HTTPS Cookie |
| `NEXT_PUBLIC_SITE_URL` | `https://你的自定义域名` | **强烈建议绑定自定义域名** |
| `NEXT_TELEMETRY_DISABLED` | `1` | 关闭遥测 |
| `STORAGE_DRIVER` | `supabase` | Vercel 未设时也会默认 supabase |
| `SUPABASE_URL` | Project URL | |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | 服务端专用 |
| `SUPABASE_STORAGE_BUCKET` | `reward-images` | |
| `SEED_OWNER_EMAIL` | 你的邮箱 | 仅 seed 时用 |
| `SEED_OWNER_PASSWORD` | 强密码 | seed 时用，不可用默认值 |

> ⚠️ **不要**在 Vercel 里手动设置 `NODE_ENV=development`。Vercel 构建时会自动使用 `production`；若手动设为 `development`，会出现 `Html should not be imported outside of pages/_document` 并导致 build 失败。

### 6.4 构建命令

Vercel 默认即可：

- **Build**：`npm run build`（含 `prisma generate`）
- **Install**：`npm ci`

首次部署前在本地或 CI 对 Supabase 执行：

```bash
npx prisma migrate deploy
npm run db:seed
```

（或在 Supabase SQL Editor 手动执行 migration SQL。）

### 6.5 自定义域名

1. Vercel → **Domains** → 添加你的域名。
2. 按提示配置 DNS。
3. 将 `NEXT_PUBLIC_SITE_URL` 改为 `https://你的域名`。
4. 重新 Deploy。

**不要用 `*.vercel.app` 作为长期生产入口**（Cookie、图片白名单、大陆访问均不理想）。

---

## 7. Vercel 上可用功能

| 功能 | 状态 |
|---|---|
| 游客浏览 `/points`、`/rewards` | ✅ |
| 注册 / 登录（自建 Auth） | ✅ |
| owner/admin `/admin`、加积分 | ✅ |
| 商品图片上传到 Supabase Storage | ✅ |
| 写入 `public/uploads` | ❌（Serverless 只读文件系统） |

---

## 8. 本地开发

```bash
cp .env.example .env
# DATABASE_URL = 本地 PG 或 Supabase pooler
# AUTH_SECRET = openssl rand -base64 48
# STORAGE_DRIVER=local   ← 默认，图片存 public/uploads/rewards

npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

**测试 Supabase Storage 上传（本地）**：

```ini
STORAGE_DRIVER=supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=reward-images
```

登录 admin → `/admin` → 上传商品图 → `/rewards` 应显示 Supabase 公开 URL。

---

## 9. 中国大陆访问风险说明

| 风险 | 说明 |
|---|---|
| **Vercel CDN** | 大陆访问速度与不稳定性无 SLA，可能慢或偶发不可达 |
| **Supabase** | 服务器多在海外，大陆直连不保证稳定 |
| **缓解** | 绑定**自定义域名**、选离用户近的 Supabase 区域 |
| **长期方案** | 若需稳定大陆访问，可迁移到 **香港/大陆 VPS** + 阿里云 RDS/OSS，见 [`DEPLOY.md`](./DEPLOY.md) |

---

## 10. 上线 Checklist

- [ ] Supabase bucket `reward-images` 已创建且 **Public**
- [ ] `DATABASE_URL` = Transaction pooler（6543）+ `pgbouncer=true`
- [ ] `DIRECT_URL` = Session/Direct（5432，无 `pgbouncer=true`）
- [ ] `AUTH_SECRET` 已随机生成
- [ ] `AUTH_COOKIE_SECURE=true`
- [ ] `NEXT_PUBLIC_SITE_URL` 为 HTTPS 自定义域名
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 仅配置在 Vercel 服务端环境变量
- [ ] 已 `prisma migrate deploy` + seed（强密码 owner）
- [ ] admin 上传图片后 `/rewards` 可显示

更多 QA：[`TESTING.md`](./TESTING.md)

---

## 11. 构建失败排查

### `Html should not be imported outside of pages/_document`（/404 预渲染失败）

**原因：** Vercel 环境变量里设置了 `NODE_ENV=development`（或非 `production` 的值）。

**修复：**

1. Vercel → **Settings** → **Environment Variables**
2. 找到 `NODE_ENV` → **Delete**（不要手动设置，交给 Vercel 自动处理）
3. **Redeploy** 项目

本地 `.env` 里的 `NODE_ENV=development` 只用于 `npm run dev`，**不要**复制到 Vercel。

参考：[Next.js non-standard NODE_ENV](https://nextjs.org/docs/messages/non-standard-node-env)
