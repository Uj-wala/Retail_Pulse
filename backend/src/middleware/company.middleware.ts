import type { Request } from "express";
import { HttpError } from "../utils/httpError.js";

export function companyScope(req: Request): { companyId: string } {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return { companyId: req.user.companyId };
}
