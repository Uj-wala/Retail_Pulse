import type {
  Category,
  Company,
  InventoryTransaction,
  Product,
  Sale,
  SaleItem,
  User,
} from "@prisma/client";

export function serializeCompany(company: Company) {
  return {
    id: company.id,
    name: company.name,
    industry: company.industry,
    email: company.email,
    address: company.address,
    phone: company.phone,
    created_at: company.createdAt.toISOString(),
    updated_at: company.updatedAt.toISOString(),
  };
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    company_id: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    last_login: user.lastLogin?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
  };
}

export function serializeCategory(category: Category) {
  return {
    id: category.id,
    company_id: category.companyId,
    name: category.name,
    description: category.description,
    created_at: category.createdAt.toISOString(),
    updated_at: category.updatedAt.toISOString(),
  };
}

export function serializeProduct(product: Product & { category?: Category | null }) {
  return {
    id: product.id,
    company_id: product.companyId,
    category_id: product.categoryId,
    category_name: product.category?.name ?? null,
    sku: product.sku,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    cost: Number(product.cost),
    stock_quantity: product.stockQuantity,
    reorder_level: product.reorderLevel,
    is_active: product.isActive,
    low_stock: product.stockQuantity <= product.reorderLevel,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
  };
}

export function serializeInventoryTransaction(
  transaction: InventoryTransaction & { product?: Product },
) {
  return {
    id: transaction.id,
    product_id: transaction.productId,
    product_name: transaction.product?.name ?? null,
    type: transaction.type,
    quantity: transaction.quantity,
    note: transaction.note,
    created_at: transaction.createdAt.toISOString(),
  };
}

export function serializeSaleItem(item: SaleItem & { product?: Product }) {
  return {
    id: item.id,
    product_id: item.productId,
    product_name: item.product?.name ?? null,
    quantity: item.quantity,
    unit_price: Number(item.unitPrice),
    subtotal: Number(item.subtotal),
  };
}

export function serializeSale(
  sale: Sale & { items?: (SaleItem & { product?: Product })[]; user?: User },
) {
  return {
    id: sale.id,
    company_id: sale.companyId,
    user_id: sale.userId,
    cashier_name: sale.user?.name ?? null,
    customer_name: sale.customerName,
    status: sale.status,
    total_amount: Number(sale.totalAmount),
    items: sale.items?.map(serializeSaleItem) ?? [],
    created_at: sale.createdAt.toISOString(),
  };
}
