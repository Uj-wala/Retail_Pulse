import type { Request, Response, NextFunction } from "express";
import { serializeInventoryTransaction } from "../utils/serializers.js";
import * as inventoryService from "../services/inventory.service.js";

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    const transactions = await inventoryService.listInventoryTransactions(req.user!.companyId, productId);
    return res.json({
      transactions: transactions.map(serializeInventoryTransaction),
      total: transactions.length,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const transaction = await inventoryService.recordInventoryTransaction(
      req.user!.companyId,
      req.user!.id,
      req.body,
    );
    return res.status(201).json({ transaction: serializeInventoryTransaction(transaction) });
  } catch (error) {
    return next(error);
  }
}
