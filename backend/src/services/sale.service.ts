import { AuditAction, InventoryTransactionType, SaleStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../utils/httpError.js";
import { saleRepository } from "../repositories/sale.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { writeAuditLog } from "./audit.service.js";
import type { CreateSaleInput } from "../validators/sale.validators.js";

export function listSales(companyId: string) {
  return saleRepository.findManyByCompany(companyId);
}

export async function getSale(companyId: string, id: string) {
  const sale = await saleRepository.findById(companyId, id);
  if (!sale) throw new HttpError(404, "Sale not found");
  return sale;
}

export async function createSale(companyId: string, userId: string, payload: CreateSaleInput) {
  return prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const lineItems: { productId: string; quantity: number; unitPrice: number; subtotal: number }[] = [];

    for (const item of payload.items) {
      const product = await productRepository.findById(companyId, item.productId, tx);
      if (!product || !product.isActive) {
        throw new HttpError(404, `Product ${item.productId} is not available`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new HttpError(422, `Insufficient stock for ${product.name}`);
      }

      const unitPrice = Number(product.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      lineItems.push({ productId: product.id, quantity: item.quantity, unitPrice, subtotal });

      await productRepository.adjustStock(product.id, -item.quantity, tx);
      await inventoryRepository.create(
        {
          companyId,
          productId: product.id,
          userId,
          type: InventoryTransactionType.SALE,
          quantity: item.quantity,
          note: "Sold via point of sale",
        },
        tx,
      );
    }

    const sale = await saleRepository.create(
      {
        companyId,
        userId,
        customerName: payload.customerName,
        status: SaleStatus.COMPLETED,
        totalAmount,
        items: { create: lineItems },
      },
      tx,
    );

    await writeAuditLog({ action: AuditAction.SALE_CREATED, companyId, userId }, tx);
    return sale;
  });
}

export async function refundSale(companyId: string, userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await saleRepository.findById(companyId, id, tx);
    if (!sale) throw new HttpError(404, "Sale not found");
    if (sale.status === SaleStatus.REFUNDED) throw new HttpError(409, "Sale is already refunded");

    for (const item of sale.items) {
      await productRepository.adjustStock(item.productId, item.quantity, tx);
      await inventoryRepository.create(
        {
          companyId,
          productId: item.productId,
          userId,
          type: InventoryTransactionType.RETURN,
          quantity: item.quantity,
          note: `Refund for sale ${sale.id}`,
        },
        tx,
      );
    }

    await saleRepository.updateStatus(sale.id, SaleStatus.REFUNDED, tx);
    await writeAuditLog({ action: AuditAction.SALE_REFUNDED, companyId, userId }, tx);
    return saleRepository.findById(companyId, id, tx);
  });
}
