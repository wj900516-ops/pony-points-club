# 部署指南（大陆 VPS 自托管）

> **Vercel + Supabase 部署**请参阅 [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md)。  
> 本文档适用于需要**大陆更稳定访问**的阿里云 / 腾讯云 / 香港 VPS 自托管方案。

目标：在**国内云服务器或香港服务器**上自托管，使用**自定义域名**，全程不依赖大陆不稳定的境外资源。

**不要用 `*.vercel.app` 作为生产入口。**

---

## 0. 架构概览

```
用户浏览器
   │  HTTPS（自定义域名，已备案或香港免备案）
   ▼
Nginx（反向代理 + TLS）
   ▼
Next.js (Node 20+, 端口 3000，pm2 守护)
   ├── public/uploads/rewards/   ← MVP 商品图本地上传（需持久化）
   ▼
PostgreSQL（云 RDS 或本机，内网连接）
```

---

## 1. 本地开发部署

```bash
cp .env.example .env
# 必填：DATABASE_URL、AUTH_SECRET（openssl rand -base64 48）
# 本地：NODE_ENV=development，AUTH_COOKIE_SECURE=false

npm install
npx prisma migrate dev
npm run db:seed          # 本地会创建演示 owner/admin
npm run dev              # http://localhost:3000
```

---

## 2. 选服务器（生产）

| 方案 | 备案 | 适用 |
|---|---|---|
| 阿里云 ECS / 腾讯云 CVM（大陆） | **需** ICP | 大陆用户最快 |
| 香港轻量应用服务器 | 免备案 | 快速上线 |

最低建议：**2 核 2G**（构建占内存，1G 易 OOM）。

---

## 3. 安装运行环境（Ubuntu 22.04 示例）

项目含 `.npmrc`（npmmirror），`npm ci` 默认走国内镜像。

```bash
npm config set registry https://registry.npmmirror.com
```

### Node 20+（任选）

- **nvm + 镜像（推荐）**：`export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node && nvm install 20`
- **NodeSource**：`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`
- **系统包 / 云厂商镜像文档**

```bash
sudo npm i -g pm2
```

### PostgreSQL

**云 RDS（推荐）**：同 VPC 内网地址写入 `DATABASE_URL`，安全组放行 ECS。

**本机自建**：

```bash
sudo apt-get install -y postgresql
sudo -u postgres createuser pony --pwprompt
sudo -u postgres createdb pony_points -O pony
```

---

## 4. 生产环境变量

复制并编辑 `.env`（**勿提交 git**）：

```ini
NODE_ENV=production
DATABASE_URL="postgresql://pony:强密码@127.0.0.1:5432/pony_points?schema=public"
AUTH_SECRET="<openssl rand -base64 48 的输出>"
NEXT_PUBLIC_SITE_URL="https://points.yourdomain.com"
AUTH_COOKIE_SECURE=true
NEXT_TELEMETRY_DISABLED=1

# 首次 seed 必填强密码（不可用 Owner@12345）
SEED_OWNER_EMAIL="you@example.com"
SEED_OWNER_PASSWORD="<强密码>"
SEED_OWNER_NAME="俱乐部主理人"
# SEED_INCLUDE_DEMO_ADMIN=false   # 生产默认不创建 staff@ponyclub.local
```

### 生成 AUTH_SECRET

```bash
openssl rand -base64 48
```

或使用：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**上线前检查：**

| 变量 | 生产要求 |
|---|---|
| `AUTH_SECRET` | ≥32 字符随机，非默认值 |
| `AUTH_COOKIE_SECURE` | 必须 `true` |
| `NEXT_PUBLIC_SITE_URL` | 正式 HTTPS 域名 |
| `NODE_ENV` | `production` |

应用启动时会校验上述配置（见 `src/lib/auth-secret.ts`）。

---

## 5. 服务器部署步骤

```bash
git clone <仓库> /opt/pony && cd /opt/pony
cp .env.example .env    # 按上一节填写

npm ci
npx prisma migrate deploy
npm run db:seed           # 仅首次；生产需先设 SEED_OWNER_PASSWORD
npm run build
pm2 start npm --name pony -- start
pm2 save && pm2 startup
```

---

## 6. Nginx 反代 + HTTPS

`/etc/nginx/sites-available/pony`：

```nginx
server {
    listen 80;
    server_name points.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name points.yourdomain.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 6m;   # 上传限制 5MB，留余量
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pony /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**SSL**：大陆推荐阿里云/腾讯云免费证书；香港可用 `certbot --nginx`。

---

## 7. 商品图片本地上传（MVP）

路径：`public/uploads/rewards/` → 访问 `/uploads/rewards/reward-*.webp`

### 必须知道

1. **写入权限**：运行 Node/pm2 的用户对该目录可写（`chown -R pony:pony public/uploads`）。
2. **部署不删图**：`npm run build` 不会删除 uploads；但 **`git pull` / rsync / CI 不要覆盖或清空** `public/uploads/rewards/`。
3. **推荐 rsync 排除**：
   ```bash
   rsync -av --exclude 'public/uploads/rewards/*' --exclude 'node_modules' --exclude '.env' ./ user@server:/opt/pony/
   ```
4. **定期备份**：`tar czf uploads-backup.tar.gz public/uploads/rewards/`
5. **单服务器适用**：MVP 本地上传**不适合多机负载均衡**（各节点文件不同步）→ 后期改 **阿里云 OSS / 腾讯云 COS**（后台填 URL，白名单已支持）。
6. **自动建目录**：启动时与首次上传均会 `mkdir -p public/uploads/rewards`（见 `src/instrumentation.ts`）。

---

## 8. 升级维护

```bash
cd /opt/pony
git pull                  # 勿删 public/uploads/rewards/
npm ci
npx prisma migrate deploy
npm run build
pm2 reload pony
```

**不要在生产重复运行 `db:seed`**，除非明确需要且已设强密码。

---

## 9. 备份

```bash
pg_dump -U pony pony_points | gzip > /backup/pony_$(date +%F).sql.gz
tar czf /backup/pony_uploads_$(date +%F).tar.gz -C /opt/pony/public/uploads rewards
```

---

## 10. 上线前 Checklist

- [ ] `AUTH_SECRET` 已随机生成
- [ ] `AUTH_COOKIE_SECURE=true`，站点走 HTTPS
- [ ] `NEXT_PUBLIC_SITE_URL` 为正式域名
- [ ] 已修改 seed owner 密码，生产未留 `Staff@12345` 演示 admin
- [ ] `public/uploads/rewards` 有写权限且已备份策略
- [ ] 域名已备案（大陆）或香港免备案
- [ ] 未使用 vercel.app 作为入口

更多 QA 见 [`TESTING.md`](./TESTING.md)。
