import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "../config/database.js";

export const refreshTokenRepository = {
  create(data: Prisma.RefreshTokenCreateInput, db: Db = prisma) {
    return db.refreshToken.create({ data });
  },

  findByHash(tokenHash: string, db: Db = prisma) {
    return db.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  },

  revoke(id: string, db: Db = prisma) {
    return db.refreshToken.update({ where: { id }, data: { revoked: true } });
  },

  revokeAllForUser(userId: string, db: Db = prisma) {
    return db.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  },
};
