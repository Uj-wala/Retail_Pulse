import type { Request, Response, NextFunction } from "express";
import { serializeCompany, serializeUser } from "../utils/serializers.js";
import * as userService from "../services/user.service.js";
import * as companyService from "../services/company.service.js";

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const [user, company] = await Promise.all([
      userService.getProfile(req.user!.id),
      companyService.getCompany(req.user!.companyId),
    ]);
    return res.json({ user: serializeUser(user), company: serializeCompany(company) });
  } catch (error) {
    return next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateProfile(req.user!.id, req.body);
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}
