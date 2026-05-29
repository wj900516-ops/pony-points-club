# Computer Use QA Checklist

供 Codex computer use 或人工在**真实浏览器**中做上线前回归。建议在本地 `npm run dev` 或 staging 域名上执行。

## 测试视口

在 DevTools 设备模式或真实设备上依次切换：

| 设备参考 | 宽度 |
|---|---|
| iPhone SE | 375px |
| iPhone 14 Pro | 390px |
| iPhone 15 Pro Max | 430px |
| iPad Mini | 768px |
| iPad Air | 820px |
| iPad Pro | 1024px |
| Desktop | 1440px |

**通过标准（每个视口）：**
- 页面无横向滚动条（`document.documentElement.scrollWidth <= clientWidth`）
- 主要按钮可点，高度 ≥ 44px
- 输入框字体 ≥ 16px（iPhone 聚焦不自动放大页面）

---

## 测试流程

### 1. 未登录浏览

- [ ] 访问 `/` → 重定向到 `/points`
- [ ] `/points`：可见老板名字、总积分、「查看历史积分」；**无**「管理」按钮
- [ ] `/rewards`：可见已上架商品卡片；无图商品显示 `/rewards/placeholder.svg`
- [ ] 导航栏：手机宽度显示「菜单」折叠；桌面显示完整链接

### 2. 注册 viewer

- [ ] `/register` 注册新账号 → 成功进入 `/points`
- [ ] 角色为访客（导航或个人信息可见）

### 3. viewer 权限

- [ ] 直接访问 `/admin` → 被重定向（`/login` 或 `/points`）
- [ ] `/points` 无「管理 ▼」、无加分按钮
- [ ] 调用 `POST /api/uploads/rewards`（未登录或无 staff cookie）→ 401 或 403

### 4. admin / owner 登录

默认 seed（可改 `.env`）：
- admin：`staff@ponyclub.local` / `Staff@12345`
- owner：`owner@ponyclub.local` / `Owner@12345`

- [ ] 登录后导航出现「后台」
- [ ] `/admin` 三板块在手机端可正常操作（老板 / 商品 / 用户[owner]）

### 5. 加积分

- [ ] `/points` → 「管理 ▼」→ 点击 `49.9` / `188` / `388`
- [ ] 总分增加（+0.2 / +1 / +2），UI 刷新
- [ ] 「查看历史积分」展开，记录完整可见（手机端可纵向滚动，无截断）

### 6. 商品管理 + 图片上传

- [ ] `/admin` → 商品管理 → 「+ 新增商品」
- [ ] **手机视口（390px）**：点「上传图片」→ 选择相册/文件 → 显示 loading → 预览出现
- [ ] **iPad 视口（820px）**：同上
- [ ] **Desktop（1440px）**：选择本地 PNG/JPEG → 上传成功
- [ ] 保存商品并上架
- [ ] `/rewards` 显示上传图片（路径 `/uploads/rewards/reward-*.webp|png|...`）

### 7. 图片安全

- [ ] 后台手动填 `https://fonts.gstatic.com/x.png` → 保存失败，中文错误提示
- [ ] 上传超过 5MB 文件 → 失败提示
- [ ] 上传非图片文件（改扩展名伪装）→ 失败提示

### 8. 响应式专项检查

- [ ] 375px：`/admin` 用户管理为**卡片式**（非挤爆表格）
- [ ] 768px：`/rewards` 商品 **2 列**
- [ ] 375px：`/rewards` 商品 **1 列**
- [ ] 1440px：`/rewards` 商品 **3–4 列**
- [ ] 手机导航「菜单」打开/关闭正常，链接不被遮挡

---

## 快速 curl（可选）

```bash
# 未登录上传 → 应 401
curl -X POST http://localhost:3000/api/uploads/rewards -F "file=@test.jpg"

# 登录后会话（需 cookie）
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@ponyclub.local","password":"Staff@12345"}' \
  -c cookies.txt

curl -X POST http://localhost:3000/api/uploads/rewards \
  -b cookies.txt -F "file=@public/rewards/placeholder-badge.svg"
# SVG 应被拒绝（仅 JPEG/PNG/WebP/GIF）
```

---

## 相关文件

| 功能 | 路径 |
|---|---|
| 上传 API | `src/app/api/uploads/rewards/route.ts` |
| 存储实现 | `src/lib/storage/reward-image-storage.ts`（local / Supabase） |
| 上传校验 | `src/lib/reward-upload.ts` |
| 图片 URL 白名单 | `src/lib/reward-image-url.ts` |
| 上传 UI | `src/components/admin/RewardImageUpload.tsx` |
| 响应式导航 | `src/components/NavBarClient.tsx` |
