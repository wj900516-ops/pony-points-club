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

- [ ] `/register` 注册新账号 → 成功进入 `/my-points`（未绑定时显示空状态）
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
| URL 白名单自动测试 | `npm run test:url-whitelist` |
| 上传 UI | `src/components/admin/RewardImageUpload.tsx` |
| 响应式导航 | `src/components/NavBarClient.tsx` |

---

## Release Candidate QA

上线前**必跑**闭环（Codex computer use 或人工）。测试域名示例：`https://xiaolinmlp.com`。

### 准备

- owner 账号（seed 或生产 owner）
- 固定测试密码示例：`QaTest12345!`
- 时间戳：`TS=$(date +%Y%m%d%H%M%S)` 或手动记当前时间

### 1. 注册 QA 用户

1. 打开 `/register`
2. 注册：
   - 邮箱：`qa-member-[timestamp]@example.com`
   - 密码：`QaTest12345!`
   - 昵称：`QA Member`
3. **预期**：注册成功后自动跳转 `/my-points`，按钮不卡在「注册中…」
4. **预期**：显示「你的账号还没有绑定积分档案」
5. **预期**：不能访问 `/admin`；`/points` 无加分按钮

### 2. Boss 绑定闭环

1. owner 登录 → `/admin` → 老板管理
2. 新建老板：`QA Bind Boss [timestamp]`
3. 点击「绑定账号」→ 搜索 QA 用户邮箱
4. **预期**：搜索结果显示邮箱、昵称、角色（访客）
5. 点击「绑定」→ **预期**：老板行显示已绑定邮箱
6. 退出 owner，QA 用户登录
7. 打开 `/my-points`
8. **预期**：显示 QA Bind Boss 名字、积分、历史（只读，无管理按钮）
9. owner 登录 → 解绑 QA 用户
10. QA 用户重新打开 `/my-points`
11. **预期**：回到未绑定空状态
12. **预期**：最近操作记录有「绑定账号」「解绑账号」

### 3. 管理员升降级

1. owner 登录 → 用户管理
2. 将 QA 用户「设为员工」
3. **预期**：提示「角色已更新，对方刷新页面后即可生效」
4. QA 用户刷新或访问 `/admin` → **预期**：可进入后台
5. owner 将 QA 用户「降为访客」
6. QA 用户刷新 → **预期**：访问 `/admin` 被重定向
7. **预期**：owner 行显示「不可修改」（不能自降级）
8. **预期**：最近操作记录有「提升为员工」「降级为访客」

### 4. 图片 URL 白名单（自动）

本地或 CI 运行：

```bash
npm run test:url-whitelist
```

**预期**：7 个禁止域名 + 4 个允许路径全部通过。

### 5. 快速检查清单

- [ ] 注册 → `/my-points` 不卡 pending
- [ ] 绑定 / 解绑 /my-points 正确
- [ ] 升降级后 `/admin` 权限正确
- [ ] `npm run test:url-whitelist` 通过
- [ ] 390 / 820 / 1440 无横向溢出
- [ ] 图片上传 Supabase 仍正常
