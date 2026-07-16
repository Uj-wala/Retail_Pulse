import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "../config/database.js";

export const saleRepository = {
  create(data: Prisma.SaleUncheckedCreateInput, db: Db = prisma) {
    return db.sale.create({ data, include: { items: { include: { product: true } }, user: true } });
  },

  findManyByCompany(companyId: string, db: Db = prisma) {
    return db.sale.findMany({
      where: { companyId },
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  },

  findById(companyId: string, id: string, db: Db = prisma) {
    return db.sale.findFirst({
      where: { id, companyId },
      include: { items: { include: { product: true } }, user: true },
    });
  },

  updateStatus(id: string, status: Prisma.SaleUpdateInput["status"], db: Db = prisma) {
    return db.sale.update({ where: { id }, data: { status } });
  },
};
