import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

/** 读取 .env 并覆盖系统环境变量（避免旧 localhost DATABASE_URL 干扰 seed） */
function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile();

// migrate/seed 走 Session pooler（DIRECT_URL）更稳；无则回退 DATABASE_URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const DEFAULT_OWNER_PASSWORD = "Owner@12345";
const DEFAULT_ADMIN_PASSWORD = "Staff@12345";
const DEFAULT_ADMIN_EMAIL = "staff@ponyclub.local";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function guardProductionSeed(): void {
  if (!isProduction()) return;

  const ownerPassword =
    process.env.SEED_OWNER_PASSWORD?.trim() || DEFAULT_OWNER_PASSWORD;

  if (
    !process.env.SEED_OWNER_PASSWORD?.trim() ||
    ownerPassword === DEFAULT_OWNER_PASSWORD
  ) {
    throw new Error(
      [
        "⛔ 生产环境禁止用默认 owner 密码执行 seed。",
        "请在 .env 设置 SEED_OWNER_EMAIL 与强密码 SEED_OWNER_PASSWORD，再运行 npm run db:seed。",
        "示例：openssl rand -base64 24",
      ].join("\n")
    );
  }

  console.warn(
    "\n⚠️  生产环境 seed 提醒：",
    "\n   - 请确认 owner 密码已设为强密码",
    "\n   - 默认示例 admin (staff@ponyclub.local) 不会创建，除非 SEED_INCLUDE_DEMO_ADMIN=true",
    "\n   - 上线后请立即登录并修改所有账号密码\n"
  );
}

async function main() {
  guardProductionSeed();

  const ownerEmail = process.env.SEED_OWNER_EMAIL || "owner@ponyclub.local";
  const ownerPassword =
    process.env.SEED_OWNER_PASSWORD || DEFAULT_OWNER_PASSWORD;
  const ownerName = process.env.SEED_OWNER_NAME || "俱乐部主理人";

  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { role: Role.OWNER, displayName: ownerName },
    create: {
      email: ownerEmail,
      passwordHash,
      displayName: ownerName,
      role: Role.OWNER,
    },
  });
  if (isProduction()) {
    console.log(`✅ owner: ${owner.email}（密码未打印，见 .env SEED_OWNER_PASSWORD）`);
  } else {
    console.log(`✅ owner: ${owner.email} (密码: ${ownerPassword})`);
  }

  const includeDemoAdmin =
    !isProduction() || process.env.SEED_INCLUDE_DEMO_ADMIN === "true";

  if (includeDemoAdmin) {
    const admin = await prisma.user.upsert({
      where: { email: DEFAULT_ADMIN_EMAIL },
      update: { role: Role.ADMIN },
      create: {
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10),
        displayName: "示例员工",
        role: Role.ADMIN,
      },
    });
    if (isProduction()) {
      console.log(
        `✅ admin: ${admin.email}（已创建演示员工，请尽快改密或删除 SEED_INCLUDE_DEMO_ADMIN）`
      );
    } else {
      console.log(`✅ admin: ${admin.email} (密码: ${DEFAULT_ADMIN_PASSWORD})`);
    }
  } else {
    console.log("⏭️  已跳过示例 admin（生产环境默认不创建 staff@ponyclub.local）");
  }

  const bossNames = ["闪电小马", "彩虹老板", "星光女王", "苹果庄园主"];
  for (const name of bossNames) {
    const existing = await prisma.boss.findFirst({ where: { name } });
    if (!existing) {
      await prisma.boss.create({ data: { name, totalPoints: 0 } });
    }
  }
  console.log(`✅ 老板：${bossNames.join("、")}`);

  const rewards = [
    {
      name: "限定小马徽章",
      description: "俱乐部专属金属徽章，闪闪发光。",
      imageUrl: "/rewards/placeholder-badge.svg",
      pointsRequired: "5.00",
      stock: 20,
    },
    {
      name: "彩虹马克杯",
      description: "渐变彩虹陶瓷杯，容量 400ml。",
      imageUrl: "/rewards/placeholder-mug.svg",
      pointsRequired: "10.00",
      stock: 15,
    },
    {
      name: "星光礼盒",
      description: "神秘周边大礼包，数量有限。",
      imageUrl: "/rewards/placeholder-box.svg",
      pointsRequired: "30.00",
      stock: 5,
    },
  ];
  for (const r of rewards) {
    const existing = await prisma.rewardItem.findFirst({ where: { name: r.name } });
    if (!existing) {
      await prisma.rewardItem.create({
        data: {
          name: r.name,
          description: r.description,
          imageUrl: r.imageUrl,
          pointsRequired: r.pointsRequired,
          stock: r.stock,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ 商品：${rewards.map((r) => r.name).join("、")}`);

  console.log("\n🎉 Seed 完成！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
