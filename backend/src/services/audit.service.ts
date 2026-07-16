import type { AuditAction } from "@prisma/client";
import { auditLogRepository } from "../repositories/auditLog.repository.js";
import type { Db } from "../config/database.js";

interface AuditInput {
  action: AuditAction;
  companyId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function writeAuditLog(input: AuditInput, db?: Db) {
  return auditLogRepository.create(
    {
      action: input.action,
      companyId: input.companyId ?? null,
      userId: input.userId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    db,
  );
}

export function listAuditLogs(companyId: string) {
  return auditLogRepository.findManyByCompany(companyId);
}
