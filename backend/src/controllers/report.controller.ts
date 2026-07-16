import type { Request, Response, NextFunction } from "express";
import * as reportService from "../services/report.service.js";

export async function getSalesReport(req: Request, res: Response, next: NextFunction) {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const report = await reportService.getSalesReport(req.user!.companyId, from, to);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
}

export async function getInventoryReport(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.getInventoryReport(req.user!.companyId);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
}
