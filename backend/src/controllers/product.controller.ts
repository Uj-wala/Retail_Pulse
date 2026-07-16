import type { Request, Response, NextFunction } from "express";
import { serializeProduct } from "../utils/serializers.js";
import { param } from "../utils/request.js";
import * as productService from "../services/product.service.js";

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productService.listProducts(req.user!.companyId, {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      categoryId: typeof req.query.categoryId === "string" ? req.query.categoryId : undefined,
      isActive: req.query.isActive === undefined ? undefined : req.query.isActive === "true",
    });
    return res.json({ products: products.map(serializeProduct), total: products.length });
  } catch (error) {
    return next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProduct(req.user!.companyId, param(req, "id"));
    return res.json({ product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.createProduct(req.user!.companyId, req.user!.id, req.body);
    return res.status(201).json({ product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.updateProduct(
      req.user!.companyId,
      req.user!.id,
      param(req, "id"),
      req.body,
    );
    return res.json({ product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await productService.deleteProduct(req.user!.companyId, req.user!.id, param(req, "id"));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function listLowStock(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productService.lowStockProducts(req.user!.companyId);
    return res.json({ products });
  } catch (error) {
    return next(error);
  }
}
