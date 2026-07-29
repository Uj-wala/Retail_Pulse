export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "ANALYST" | "VIEWER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type InventoryMovementType = "SALE" | "MANUAL_ADJUSTMENT" | "STOCK_ADDITION" | "STOCK_REMOVAL";
export type StockAdjustmentType = "STOCK_IN" | "STOCK_OUT" | "MANUAL_ADJUSTMENT";
export type AdjustmentDirection = "INCREASE" | "DECREASE";
export type SaleStatus = "COMPLETED" | "REFUNDED" | "CANCELLED";
export type SalesChannel = "RETAIL_STORE" | "ONLINE_STORE" | "MARKETPLACE";
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";

export interface Company {
  id: string;
  name: string;
  industry: string;
  email: string;
  address: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  last_login: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: User;
}

export interface ProfileResponse {
  user: User;
  company: Company;
}

export type AuditEntityType = "COMPANY" | "USER" | "CATEGORY" | "PRODUCT" | "INVENTORY" | "SALE" | "REPORT";

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: AuditEntityType | null;
  details: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  category_id: string;
  category_name: string | null;
  sku: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit_price: number;
  cost_price: number;
  stock_quantity: number;
  reorder_level: number;
  unit_of_measure: string;
  is_active: boolean;
  low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  company_id: string;
  product_id: string;
  product_name: string | null;
  sku: string | null;
  category_id: string | null;
  category_name: string | null;
  brand: string | null;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  stock_status: StockStatus;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  product_id: string | null;
  product_name: string | null;
  movement_type: InventoryMovementType;
  quantity_changed: number;
  previous_quantity: number;
  updated_quantity: number;
  reason: string;
  remarks: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalInventoryQuantity: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export interface InventoryCharts {
  byCategory: { category: string; totalStock: number }[];
  byStatus: { status: StockStatus; count: number }[];
}

export interface Notification {
  id: string;
  product_id: string | null;
  product_name: string | null;
  title: string;
  message: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  product_id: string;
  product_name: string | null;
  category_id: string | null;
  category_name: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
  remaining_stock: number | null;
}

export interface Sale {
  id: string;
  company_id: string;
  user_id: string;
  created_by: string;
  cashier_name: string | null;
  invoice_number: string;
  customer_name: string | null;
  sale_date: string;
  sales_channel: SalesChannel;
  payment_method: PaymentMethod;
  status: SaleStatus;
  total_amount: number;
  items: SaleItem[];
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  low_stock_count: number;
  total_products: number;
  active_products: number;
  inactive_products: number;
  total_categories: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
}

export interface SalesReport {
  total_revenue: number;
  total_orders: number;
  total_units_sold: number;
  sales: {
    id: string;
    cashier_name: string;
    customer_name: string | null;
    total_amount: number;
    item_count: number;
    created_at: string;
  }[];
}

export interface DashboardFilterValues {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
  categoryId?: string;
  brand?: string;
  salesChannel?: SalesChannel;
  paymentMethod?: PaymentMethod;
}

export type DashboardGranularity = "daily" | "weekly" | "monthly";

export interface DashboardKpis {
  totalRevenue: number;
  totalOrders: number;
  totalProductsSold: number;
  averageOrderValue: number;
  totalInventoryValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalCategories: number;
}

export interface RevenueTrendPoint {
  period: string;
  revenue: number;
}

export interface SalesTrendPoint {
  period: string;
  orders: number;
  unitsSold: number;
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
}

export interface TopCategoryRevenue {
  category: string;
  revenue: number;
  unitsSold: number;
}

export interface PaymentMethodRevenue {
  paymentMethod: PaymentMethod;
  revenue: number;
}

export interface ChannelRevenue {
  salesChannel: SalesChannel;
  revenue: number;
}

export interface CategoryDistribution {
  category: string;
  productCount: number;
  totalStock: number;
}

export interface StockStatusSummary {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface DashboardProductRow {
  productId: string;
  sku: string;
  name: string;
  categoryName: string | null;
  brand: string | null;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  costPrice: number;
}

export interface CategoryValue {
  category: string;
  inventoryValue: number;
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  sales: {
    revenueTrend: RevenueTrendPoint[];
    salesTrend: SalesTrendPoint[];
    topProducts: TopSellingProduct[];
    topCategories: TopCategoryRevenue[];
    byPaymentMethod: PaymentMethodRevenue[];
    byChannel: ChannelRevenue[];
  };
  inventory: {
    distributionByCategory: CategoryDistribution[];
    stockStatusSummary: StockStatusSummary;
    topLowStock: DashboardProductRow[];
    outOfStock: DashboardProductRow[];
    valueByCategory: CategoryValue[];
  };
}

export interface DashboardFilterOptions {
  products: { id: string; name: string; sku: string }[];
  categories: { id: string; name: string }[];
  brands: string[];
  salesChannels: SalesChannel[];
  paymentMethods: PaymentMethod[];
}

export interface DashboardSaleRow {
  saleId: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  salesChannel: SalesChannel;
  paymentMethod: PaymentMethod;
  amount: number;
  quantity: number;
}

export type DashboardKpiKey =
  | "revenue"
  | "orders"
  | "products_sold"
  | "average_order_value"
  | "inventory_value"
  | "low_stock"
  | "out_of_stock"
  | "categories";

export interface DashboardKpiDrilldown {
  kpi: DashboardKpiKey;
  type: "sales" | "products" | "categories";
  rows: (DashboardSaleRow | DashboardProductRow | { categoryId: string; categoryName: string; productCount: number })[];
}

export interface DashboardCategoryDrilldown {
  categoryId: string;
  categoryName: string;
  rows: { productId: string; sku: string; name: string; stockQuantity: number; unitsSold: number; revenue: number }[];
}

export interface DashboardProductDrilldown {
  productId: string;
  productName: string;
  rows: DashboardSaleRow[];
}

export interface InventoryReport {
  total_products: number;
  total_stock_units: number;
  inventory_value: number;
  low_stock_count: number;
  products: {
    id: string;
    sku: string;
    name: string;
    category_name: string | null;
    stock_quantity: number;
    reorder_level: number;
    low_stock: boolean;
  }[];
}
