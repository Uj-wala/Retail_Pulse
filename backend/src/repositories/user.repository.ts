import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "../config/database.js";

export const userRepository = {
  findById(id: string, db: Db = prisma) {
    return db.user.findUnique({ where: { id } });
  },

  findByEmail(email: string, db: Db = prisma) {
    return db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  },

  findManyByCompany(companyId: string, db: Db = prisma) {
    return db.user.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } });
  },

  findFirstAdminForCompany(companyId: string, db: Db = prisma) {
    return db.user.findFirst({
      where: { companyId, role: "COMPANY_ADMIN", status: "ACTIVE" },
    });
  },

  create(data: Prisma.UserCreateInput, db: Db = prisma) {
    return db.user.create({ data });
  },

  update(id: string, data: Prisma.UserUpdateInput, db: Db = prisma) {
    return db.user.update({ where: { id }, data });
  },
};
