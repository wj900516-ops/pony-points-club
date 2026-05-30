import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "BOSS_CREATE"
  | "BOSS_RENAME"
  | "BOSS_ARCHIVE"
  | "BOSS_DELETE"
  | "BOSS_RESTORE"
  | "BOSS_BIND_USER"
  | "BOSS_UNBIND_USER"
  | "ROLE_PROMOTE"
  | "ROLE_DEMOTE"
  | "POINT_MANUAL_ADD"
  | "POINT_MANUAL_DEDUCT"
  | "POINT_VOID"
  | "REDEEM";

type Client = Prisma.TransactionClient | typeof prisma;

interface WriteAuditInput {
  action: AuditAction;
  entityType: "Boss" | "User" | "RewardItem" | "PointTransaction";
  entityId?: string | null;
  operatorId: string;
  detail?: Record<string, unknown>;
}

/**
 * 写入一条审计日志。可传入事务 client 以保证与主操作原子提交。
 * 失败不应吞掉（调用方在事务内时会一起回滚）。
 */
export async function writeAudit(
  client: Client,
  input: WriteAuditInput
): Promise<void> {
  await client.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      operatorId: input.operatorId,
      detail: (input.detail ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
