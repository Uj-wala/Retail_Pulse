import type { NextFunction, Request, Response } from "express";
import { decodeAccessToken } from "../config/jwt.js";
import { prisma } from "../config/database.js";
import { HttpError } from "../utils/httpError.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new HttpError(401, "Could not validate credentials");

    const payload = decodeAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE") {
      throw new HttpError(401, "User is inactive or no longer exists");
    }

    req.user = {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Could not validate credentials"));
  }
}
