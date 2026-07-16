import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "../config/database.js";

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

function buildWhere(companyId: string, filters: ProductFilters): Prisma.ProductWhereInput {
  return {
    companyId,
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { sku: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export const productRepository = {
  findManyByCompany(companyId: string, filters: ProductFilters = {}, db: Db = prisma) {
    return db.product.findMany({
      where: buildWhere(companyId, filters),
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(companyId: string, id: string, db: Db = prisma) {
    return db.product.findFirst({ where: { id, companyId }, include: { category: true } });
  },

  findBySku(companyId: string, sku: string, db: Db = prisma) {
    return db.product.findFirst({ where: { companyId, sku: { equals: sku, mode: "insensitive" } } });
  },

  create(data: Prisma.ProductUncheckedCreateInput, db: Db = prisma) {
    return db.product.create({ data, include: { category: true } });
  },

  update(id: string, data: Prisma.ProductUpdateInput, db: Db = prisma) {
    return db.product.update({ where: { id }, data, include: { category: true } });
  },

  delete(id: string, db: Db = prisma) {
    return db.product.delete({ where: { id } });
  },

  adjustStock(id: string, delta: number, db: Db = prisma) {
    return db.product.update({ where: { id }, data: { stockQuantity: { increment: delta } } });
  },

  lowStock(companyId: string, db: Db = prisma) {
    return db.$queryRaw`
      SELECT * FROM products
      WHERE company_id = ${companyId}::uuid AND stock_quantity <= reorder_level AND is_active = true
      ORDER BY stock_quantity ASC
    `;
  },
};
