import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "../config/database.js";

export const categoryRepository = {
  findManyByCompany(companyId: string, db: Db = prisma) {
    return db.category.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  },

  findById(companyId: string, id: string, db: Db = prisma) {
    return db.category.findFirst({ where: { id, companyId } });
  },

  findByName(companyId: string, name: string, db: Db = prisma) {
    return db.category.findFirst({ where: { companyId, name: { equals: name, mode: "insensitive" } } });
  },

  create(data: Prisma.CategoryUncheckedCreateInput, db: Db = prisma) {
    return db.category.create({ data });
  },

  update(id: string, data: Prisma.CategoryUpdateInput, db: Db = prisma) {
    return db.category.update({ where: { id }, data });
  },

  delete(id: string, db: Db = prisma) {
    return db.category.delete({ where: { id } });
  },

  countProducts(categoryId: string, db: Db = prisma) {
    return db.product.count({ where: { categoryId } });
  },
};
