import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "../config/database.js";

export const inventoryRepository = {
  create(data: Prisma.InventoryTransactionUncheckedCreateInput, db: Db = prisma) {
    return db.inventoryTransaction.create({ data, include: { product: true } });
  },

  findManyByCompany(companyId: string, productId: string | undefined, db: Db = prisma) {
    return db.inventoryTransaction.findMany({
      where: { companyId, ...(productId ? { productId } : {}) },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  },
};
