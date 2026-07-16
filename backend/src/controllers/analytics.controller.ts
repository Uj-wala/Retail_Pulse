import type { Request, Response, NextFunction } from "express";
import * as analyticsService from "../services/analytics.service.js";

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await analyticsService.getSummary(req.user!.companyId);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
}

export async function getRevenueOverTime(req: Request, res: Response, next: NextFunction) {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const series = await analyticsService.getRevenueOverTime(req.user!.companyId, days);
    return res.json({ series });
  } catch (error) {
    return next(error);
  }
}

export async function getTopProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const products = await analyticsService.getTopProducts(req.user!.companyId, limit);
    return res.json({ products });
  } catch (error) {
    return next(error);
  }
}

export async function getSalesByCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await analyticsService.getSalesByCategory(req.user!.companyId);
    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
}
