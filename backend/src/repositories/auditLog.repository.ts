import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "../config/database.js";

export const auditLogRepository = {
  create(data: Prisma.AuditLogUncheckedCreateInput, db: Db = prisma) {
    return db.auditLog.create({ data });
  },

  findManyByCompany(companyId: string, take = 50, db: Db = prisma) {
    return db.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take,
      include: { user: true },
    });
  },
};
