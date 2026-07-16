import type { Request, Response, NextFunction } from "express";
import { serializeSale } from "../utils/serializers.js";
import { param } from "../utils/request.js";
import * as saleService from "../services/sale.service.js";

export async function listSales(req: Request, res: Response, next: NextFunction) {
  try {
    const sales = await saleService.listSales(req.user!.companyId);
    return res.json({ sales: sales.map(serializeSale), total: sales.length });
  } catch (error) {
    return next(error);
  }
}

export async function getSale(req: Request, res: Response, next: NextFunction) {
  try {
    const sale = await saleService.getSale(req.user!.companyId, param(req, "id"));
    return res.json({ sale: serializeSale(sale) });
  } catch (error) {
    return next(error);
  }
}

export async function createSale(req: Request, res: Response, next: NextFunction) {
  try {
    const sale = await saleService.createSale(req.user!.companyId, req.user!.id, req.body);
    return res.status(201).json({ sale: serializeSale(sale) });
  } catch (error) {
    return next(error);
  }
}

export async function refundSale(req: Request, res: Response, next: NextFunction) {
  try {
    const sale = await saleService.refundSale(req.user!.companyId, req.user!.id, param(req, "id"));
    return res.json({ sale: serializeSale(sale!) });
  } catch (error) {
    return next(error);
  }
}
