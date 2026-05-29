# 🦄 Pony Points Club · 小马宝莉主题积分系统（MVP）

一个**中国大陆可稳定访问**的积分网站：访客浏览积分榜与兑换商城，owner/admin 登录后台为老板加分、维护商品、管理用户角色。

## 技术栈

| 层 | 选型 | 大陆可用性说明 |
|---|---|---|
| 框架 | Next.js 15 App Router + TypeScript | 自托管，不绑定 vercel.app |
| 数据库 | PostgreSQL | 阿里云/腾讯云 RDS 或自建 |
| ORM | Prisma | — |
| 认证 | **自建邮箱密码登录**（`jose` 签 JWT + httpOnly Cookie） | 无 Google / Firebase / Supabase Auth |
| 密码 | `bcryptjs`（纯 JS） | 无原生编译依赖 |
| 样式 | Tailwind CSS + **系统字体栈** | 不加载 Google Fonts |
| 图片 | Supabase Storage（Vercel）/ 本地 uploads / OSS | 见 [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md) |

> 全站**无** Google 登录、Firebase、Supabase Auth、Google Fonts、Google Analytics、reCAPTCHA、YouTube embed。所有 JS/CSS 由本项目自身提供。

## 角色与权限

| 角色 | 权限 |
|---|---|
| `OWNER` 主理人（你） | 全部权限，且唯一可修改用户角色 |
| `ADMIN` 员工 | 加积分、管理老板、管理商品 |
| `VIEWER` 访客 | 仅浏览积分榜、积分历史、兑换商城（注册默认角色） |

**后端强制校验**（`src/lib/permissions.ts` + 各 server action），前端隐藏按钮只是辅助：
- public：可读 bosses / point transactions / active reward items
- owner+admin：create point transactions、update bosses、manage reward items
- owner only：修改用户 role（且不能升任何人为 owner，owner 仅数据库手动设置）

## 本地测试步骤

1. **准备 PostgreSQL**（任选其一）：
   - 本机已装 PG：建库 `createdb pony_points`
   - 或 Docker：
     ```bash
     docker run --name pony-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pony_points -p 5432:5432 -d postgres:16
     ```

2. **配置环境变量**：
   ```bash
   cp .env.example .env
   # 必填：DATABASE_URL、DIRECT_URL、AUTH_SECRET
   # 本地无 pooler 时：DIRECT_URL 可与 DATABASE_URL 相同
   openssl rand -base64 48
   # 将输出填入 .env 的 AUTH_SECRET=
   ```

   本地开发示例：
   ```ini
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pony_points?schema=public
   DIRECT_URL=postgresql://postgres:postgres@localhost:5432/pony_points?schema=public
   NODE_ENV=development
   AUTH_COOKIE_SECURE=false
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Supabase 开发示例见 [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md)（`DATABASE_URL` 6543 + `DIRECT_URL` 5432）。

3. **安装依赖 + 初始化数据库 + 灌入种子数据**：
   ```bash
   npm install
   npx prisma migrate dev --name init
   # 本地 seed 可设 SEED_OWNER_PASSWORD=Owner@12345 或使用 .env 留空（非生产允许演示密码）
   npm run db:seed
   ```

4. **启动**：
   ```bash
   npm run dev
   ```

5. **本地演示账号**（仅 `NODE_ENV=development` seed 时）：
   - owner：`owner@ponyclub.local` / 见 `SEED_OWNER_PASSWORD` 或 seed 输出
   - admin：`staff@ponyclub.local` / `Staff@12345`

> ⛔ **生产环境**：必须在 `.env` 设置强密码 `SEED_OWNER_PASSWORD`；seed 会拒绝默认 `Owner@12345`。生产默认**不创建** `staff@ponyclub.local`，除非 `SEED_INCLUDE_DEMO_ADMIN=true`。上线后立即登录修改密码。

### 创建第一个 owner 账号

**方式 A — 种子脚本（推荐首次部署）**
```bash
# 在 .env 设置真实邮箱与强密码
SEED_OWNER_EMAIL="you@example.com"
SEED_OWNER_PASSWORD="YourStrongPassword123"
npm run db:seed
```

**方式 B — 数据库手动设置**
1. 先通过 `/register` 注册一个普通账号（role 默认为 `VIEWER`）。
2. 在 PostgreSQL 中执行：
   ```sql
   UPDATE users SET role = 'OWNER' WHERE email = 'you@example.com';
   ```
3. 退出登录后重新登录，JWT 会话会带上新 role。

> owner 不能通过 UI 或注册接口创建；`updateUserRoleAction` 只允许在 `ADMIN` / `VIEWER` 之间切换。

## 部署

| 方案 | 文档 |
|---|---|
| **Vercel + Supabase**（推荐快速上线） | [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md) |
| 大陆 VPS 自托管 | [`DEPLOY.md`](./DEPLOY.md) |

## 中国大陆访问说明

- **Vercel + Supabase** 不保证大陆稳定访问；请绑定自定义域名。
- 若需稳定大陆体验，请使用 [`DEPLOY.md`](./DEPLOY.md) 迁移到香港/大陆服务器 + 阿里云 OSS/RDS。

## Computer Use / 多端 QA

上线前可用 Codex computer use 或 DevTools 设备模式做回归，详见 [`TESTING.md`](./TESTING.md)（含 375px–1440px 视口清单、图片上传、权限用例）。

## 权限测试步骤（建议逐条验证）

### A. 访客 / viewer
1. 不登录访问 `/points`：能看到老板名字、总积分、「查看历史积分」；**看不到**「管理」下拉。
2. `/rewards`：只看到已上架商品。
3. 直接访问 `/admin`：被重定向到 `/login` 或 `/points`。
4. 注册新账号 → 自动为 `VIEWER`，行为同上。

### B. 接口级越权测试（关键，证明不只靠前端隐藏）
即便绕过 UI 直接调用，也应被拒：
```bash
# 未登录调用加分（应失败：请先登录）—— 通过浏览器 devtools 调用 server action，
# 或用 viewer 账号登录后构造请求。预期 addPointsAction 返回 { ok:false, error:"无权操作" }
```
要点：`addPointsAction`/`createRewardAction`/`updateBossAction` 都先 `requireStaff()`；`updateUserRoleAction` 先 `requireOwner()`。viewer/未登录一律被拒。

### C. admin（员工）
1. 登录 admin → `/points` 出现「管理 ▼」，点开有 `49.9 / 188 / 388` 三个按钮。
2. 点击任一档位 → 总分按规则增加（49.9→+0.2，188→+1，388→+2），历史新增一条。
3. `/admin` 可新增/改名老板、增删改商品、上下架。
4. `/admin` **看不到**「用户管理」板块。

### D. owner（主理人）
1. 登录 owner → `/admin` 多出「用户管理」。
2. 把某 viewer「设为员工」→ 该用户重新登录后获得后台权限。
3. 把某 admin「降为访客」→ 权限收回。
4. 无法修改自己或其他 owner 的角色；无「升为 owner」选项。

## 认证 API（自建后端，不依赖第三方 Auth）

表单登录/注册走 Server Actions；也可用 JSON API（同一套 `auth-credentials` 逻辑 + httpOnly Cookie 会话）：

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/auth/register` | Body: `{ email, password, displayName }` → 201 + `{ user }`，默认 role=VIEWER |
| `POST` | `/api/auth/login` | Body: `{ email, password }` → `{ user }` |
| `POST` | `/api/auth/logout` | 清除会话 → `{ ok: true }` |
| `GET` | `/api/auth/session` | 已登录 → `{ user }`；未登录 → 401 + `{ user: null }` |

```bash
# 示例：注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test12345","displayName":"测试用户"}' \
  -c cookies.txt

# 示例：查看会话
curl http://localhost:3000/api/auth/session -b cookies.txt
```

## 中国大陆部署（VPS 自托管）

> 若使用 **Vercel + Supabase**，请参阅 [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md)。

详见 [`DEPLOY.md`](./DEPLOY.md)（含环境变量、Nginx、HTTPS、上传目录持久化、上线 Checklist）。

## 目录结构

```
prisma/
  schema.prisma          # 数据模型
  seed.ts                # 种子数据（owner/admin/老板/商品）
src/
  lib/
    prisma.ts            # PrismaClient 单例
    auth.ts              # JWT 会话 helper（签发/校验/销毁）
    permissions.ts       # requireUser/requireStaff/requireOwner
    password.ts          # bcrypt 哈希/校验
    points.ts            # 积分档位规则（唯一真相来源）
    validations.ts       # zod 校验
    format.ts            # 前端格式化
  app/
    actions/             # server actions：auth/points/bosses/rewards/users/history
    api/auth/            # REST：login/register/logout/session（与 actions 共用逻辑）
    login/ register/     # 登录注册页
    points/              # 积分榜
    rewards/             # 兑换商城
    admin/               # 后台（守卫 staff/owner）
  components/            # NavBar / BossCard / admin/*
```

## 第二阶段（未包含）
- 兑换扣分与 `RewardRedemption` 流程（表已预留）
- 邮箱验证 / 找回密码（SMTP 已预留环境变量）
- 多语言（i18n）
