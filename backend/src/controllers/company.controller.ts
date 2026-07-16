import type { Request, Response, NextFunction } from "express";
import { serializeCompany } from "../utils/serializers.js";
import * as companyService from "../services/company.service.js";

export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const company = await companyService.getCompany(req.user!.companyId);
    return res.json({ company: serializeCompany(company) });
  } catch (error) {
    return next(error);
  }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const company = await companyService.updateCompany(req.user!.companyId, req.user!.id, req.body);
    return res.json({ company: serializeCompany(company) });
  } catch (error) {
    return next(error);
  }
}
