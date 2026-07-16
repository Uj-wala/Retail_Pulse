import { SaleStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { productRepository } from "../repositories/product.repository.js";

export async function getSalesReport(companyId: string, from?: Date, to?: Date) {
  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      status: SaleStatus.COMPLETED,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: { items: { include: { product: true } }, user: true },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const totalUnits = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );

  return {
    total_revenue: totalRevenue,
    total_orders: sales.length,
    total_units_sold: totalUnits,
    sales: sales.map((sale) => ({
      id: sale.id,
      cashier_name: sale.user.name,
      customer_name: sale.customerName,
      total_amount: Number(sale.totalAmount),
      item_count: sale.items.length,
      created_at: sale.createdAt.toISOString(),
    })),
  };
}

export async function getInventoryReport(companyId: string) {
  const products = await prisma.product.findMany({
    where: { companyId },
    include: { category: true },
    orderBy: { stockQuantity: "asc" },
  });
  const lowStock = await productRepository.lowStock(companyId);

  return {
    total_products: products.length,
    total_stock_units: products.reduce((sum, product) => sum + product.stockQuantity, 0),
    inventory_value: products.reduce(
      (sum, product) => sum + Number(product.cost) * product.stockQuantity,
      0,
    ),
    low_stock_count: (lowStock as unknown[]).length,
    products: products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category_name: product.category?.name ?? null,
      stock_quantity: product.stockQuantity,
      reorder_level: product.reorderLevel,
      low_stock: product.stockQuantity <= product.reorderLevel,
    })),
  };
}
