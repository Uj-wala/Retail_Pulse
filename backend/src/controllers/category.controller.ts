import type { Request, Response, NextFunction } from "express";
import { serializeCategory } from "../utils/serializers.js";
import { param } from "../utils/request.js";
import * as categoryService from "../services/category.service.js";

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.listCategories(req.user!.companyId);
    return res.json({ categories: categories.map(serializeCategory), total: categories.length });
  } catch (error) {
    return next(error);
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.getCategory(req.user!.companyId, param(req, "id"));
    return res.json({ category: serializeCategory(category) });
  } catch (error) {
    return next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.createCategory(req.user!.companyId, req.user!.id, req.body);
    return res.status(201).json({ category: serializeCategory(category) });
  } catch (error) {
    return next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.updateCategory(
      req.user!.companyId,
      req.user!.id,
      param(req, "id"),
      req.body,
    );
    return res.json({ category: serializeCategory(category) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await categoryService.deleteCategory(req.user!.companyId, req.user!.id, param(req, "id"));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
