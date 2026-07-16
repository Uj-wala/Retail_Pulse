import { SaleStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { productRepository } from "../repositories/product.repository.js";

export async function getSummary(companyId: string) {
  const [revenueAgg, orderCount, lowStockRows, distinctCustomers] = await Promise.all([
    prisma.sale.aggregate({
      where: { companyId, status: SaleStatus.COMPLETED },
      _sum: { totalAmount: true },
    }),
    prisma.sale.count({ where: { companyId, status: SaleStatus.COMPLETED } }),
    productRepository.lowStock(companyId) as Promise<unknown[]>,
    prisma.sale.findMany({
      where: { companyId, status: SaleStatus.COMPLETED, customerName: { not: null } },
      distinct: ["customerName"],
      select: { customerName: true },
    }),
  ]);

  return {
    total_revenue: Number(revenueAgg._sum.totalAmount ?? 0),
    total_orders: orderCount,
    total_customers: distinctCustomers.length,
    low_stock_count: lowStockRows.length,
  };
}

export async function getRevenueOverTime(companyId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sales = await prisma.sale.findMany({
    where: { companyId, status: SaleStatus.COMPLETED, createdAt: { gte: since } },
    select: { createdAt: true, totalAmount: true },
  });

  const buckets = new Map<string, number>();
  for (const sale of sales) {
    const day = sale.createdAt.toISOString().slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + Number(sale.totalAmount));
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

export async function getTopProducts(companyId: string, limit = 5) {
  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { sale: { companyId, status: SaleStatus.COMPLETED } },
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((row) => row.productId) } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  return grouped.map((row) => ({
    product_id: row.productId,
    product_name: byId.get(row.productId)?.name ?? "Unknown",
    units_sold: row._sum.quantity ?? 0,
    revenue: Number(row._sum.subtotal ?? 0),
  }));
}

export async function getSalesByCategory(companyId: string) {
  const items = await prisma.saleItem.findMany({
    where: { sale: { companyId, status: SaleStatus.COMPLETED } },
    include: { product: { include: { category: true } } },
  });

  const buckets = new Map<string, number>();
  for (const item of items) {
    const label = item.product.category?.name ?? "Uncategorized";
    buckets.set(label, (buckets.get(label) ?? 0) + Number(item.subtotal));
  }

  return Array.from(buckets.entries()).map(([category, revenue]) => ({ category, revenue }));
}
