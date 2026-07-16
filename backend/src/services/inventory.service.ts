import { AuditAction, InventoryTransactionType } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { writeAuditLog } from "./audit.service.js";
import type { CreateInventoryTransactionInput } from "../validators/inventory.validators.js";

function directionFor(type: InventoryTransactionType): 1 | -1 {
  return type === InventoryTransactionType.RESTOCK || type === InventoryTransactionType.RETURN ? 1 : -1;
}

export function listInventoryTransactions(companyId: string, productId?: string) {
  return inventoryRepository.findManyByCompany(companyId, productId);
}

export async function recordInventoryTransaction(
  companyId: string,
  userId: string,
  payload: CreateInventoryTransactionInput,
) {
  const product = await productRepository.findById(companyId, payload.productId);
  if (!product) throw new HttpError(404, "Product not found");

  const delta = directionFor(payload.type) * payload.quantity;
  if (product.stockQuantity + delta < 0) {
    throw new HttpError(422, "Adjustment would result in negative stock");
  }

  await productRepository.adjustStock(product.id, delta);
  const transaction = await inventoryRepository.create({
    companyId,
    productId: product.id,
    userId,
    type: payload.type,
    quantity: payload.quantity,
    note: payload.note,
  });
  await writeAuditLog({ action: AuditAction.INVENTORY_ADJUSTED, companyId, userId });
  return transaction;
}
