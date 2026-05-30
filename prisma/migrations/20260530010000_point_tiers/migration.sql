-- Add configurable point tiers while keeping existing point history intact.
CREATE TABLE "point_tiers" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceAmount" DECIMAL(10,2) NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_tiers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "point_transactions" ADD COLUMN "tierId" TEXT;

CREATE INDEX "point_tiers_isActive_sortOrder_idx" ON "point_tiers"("isActive", "sortOrder");
CREATE INDEX "point_transactions_tierId_idx" ON "point_transactions"("tierId");

ALTER TABLE "point_tiers"
  ADD CONSTRAINT "point_tiers_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "point_tiers"
  ADD CONSTRAINT "point_tiers_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "point_transactions"
  ADD CONSTRAINT "point_transactions_tierId_fkey"
  FOREIGN KEY ("tierId") REFERENCES "point_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "point_tiers" ("id", "label", "priceAmount", "points", "sortOrder", "isActive")
VALUES
  ('default-tier-49-9', '49.9', 49.90, 0.20, 10, true),
  ('default-tier-188', '188', 188.00, 1.00, 20, true),
  ('default-tier-388', '388', 388.00, 2.00, 30, true);
