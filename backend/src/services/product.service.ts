import { AuditAction } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";
import { productRepository, type ProductFilters } from "../repositories/product.repository.js";
import { writeAuditLog } from "./audit.service.js";
import type { CreateProductInput, UpdateProductInput } from "../validators/product.validators.js";

export function listProducts(companyId: string, filters: ProductFilters) {
  return productRepository.findManyByCompany(companyId, filters);
}

export async function getProduct(companyId: string, id: string) {
  const product = await productRepository.findById(companyId, id);
  if (!product) throw new HttpError(404, "Product not found");
  return product;
}

export async function createProduct(companyId: string, userId: string, payload: CreateProductInput) {
  const existing = await productRepository.findBySku(companyId, payload.sku);
  if (existing) throw new HttpError(409, "A product with this SKU already exists");

  const product = await productRepository.create({
    companyId,
    categoryId: payload.categoryId ?? null,
    sku: payload.sku.trim(),
    name: payload.name.trim(),
    description: payload.description?.trim(),
    price: payload.price,
    cost: payload.cost,
    stockQuantity: payload.stockQuantity,
    reorderLevel: payload.reorderLevel,
    isActive: payload.isActive,
  });
  await writeAuditLog({ action: AuditAction.PRODUCT_CREATED, companyId, userId });
  return product;
}

export async function updateProduct(
  companyId: string,
  userId: string,
  id: string,
  payload: UpdateProductInput,
) {
  await getProduct(companyId, id);
  const product = await productRepository.update(id, {
    ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
    ...(payload.sku !== undefined ? { sku: payload.sku.trim() } : {}),
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.description !== undefined ? { description: payload.description?.trim() } : {}),
    ...(payload.price !== undefined ? { price: payload.price } : {}),
    ...(payload.cost !== undefined ? { cost: payload.cost } : {}),
    ...(payload.stockQuantity !== undefined ? { stockQuantity: payload.stockQuantity } : {}),
    ...(payload.reorderLevel !== undefined ? { reorderLevel: payload.reorderLevel } : {}),
    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
  });
  await writeAuditLog({ action: AuditAction.PRODUCT_UPDATED, companyId, userId });
  return product;
}

export async function deleteProduct(companyId: string, userId: string, id: string) {
  await getProduct(companyId, id);
  await productRepository.delete(id);
  await writeAuditLog({ action: AuditAction.PRODUCT_DELETED, companyId, userId });
}

export function lowStockProducts(companyId: string) {
  return productRepository.lowStock(companyId);
}
