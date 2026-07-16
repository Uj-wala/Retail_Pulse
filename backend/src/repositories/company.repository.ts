import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "../config/database.js";

export const companyRepository = {
  findById(id: string, db: Db = prisma) {
    return db.company.findUnique({ where: { id } });
  },

  findByEmailOrName(email: string, name: string, db: Db = prisma) {
    return db.company.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { name: { equals: name, mode: "insensitive" } },
        ],
      },
    });
  },

  create(data: Prisma.CompanyCreateInput, db: Db = prisma) {
    return db.company.create({ data });
  },

  update(id: string, data: Prisma.CompanyUpdateInput, db: Db = prisma) {
    return db.company.update({ where: { id }, data });
  },
};
