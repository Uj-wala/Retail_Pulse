export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "ANALYST" | "VIEWER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type InventoryMovementType = "SALE" | "MANUAL_ADJUSTMENT" | "STOCK_ADDITION" | "STOCK_REMOVAL";
export type StockAdjustmentType = "STOCK_IN" | "STOCK_OUT" | "MANUAL_ADJUSTMENT";
export type AdjustmentDirection = "INCREASE" | "DECREASE";
export type SaleStatus = "COMPLETED" | "REFUNDED" | "CANCELLED";
export type SalesChannel = "RETAIL_STORE" | "ONLINE_STORE" | "MARKETPLACE";
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";
export type CustomerType = "RETAIL" | "WHOLESALE" | "CORPORATE";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
export type CustomerSegment = "NEW" | "REGULAR" | "LOYAL" | "VIP";

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

export type AuditEntityType = "COMPANY" | "USER" | "CATEGORY" | "PRODUCT" | "INVENTORY" | "SALE" | "REPORT" | "DASHBOARD" | "CUSTOMER";

export interface ActivityLogEntry {
  id: string;
  company_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  user_id?: string | null;
  performed_by?: string | null;
  action: string;
  entity_type: AuditEntityType | null;
  entity_id: string | null;
  details: string | null;
  previous_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
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
  customer_id: string | null;
  customer_name: string | null;
  title: string;
  message: string;
  is_read: boolean;
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
  customer_id: string | null;
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
  customers: CustomerInsights;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export interface CustomerPurchaseSummary {
  total_orders: number;
  total_revenue: number;
  total_quantity: number;
  average_order_value: number;
  first_purchase_date: string | null;
  last_purchase_date: string | null;
  favorite_product_id: string | null;
  favorite_product_name: string | null;
  favorite_category_id: string | null;
  favorite_category_name: string | null;
  segment: CustomerSegment;
}

export interface Customer {
  id: string;
  company_id: string;
  customer_code: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: Gender | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  customer_type: CustomerType;
  preferred_channel: SalesChannel | null;
  is_active: boolean;
  summary: CustomerPurchaseSummary;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile extends Customer {
  recent_activity: Sale[];
}

export interface CustomerTimelineEntry {
  type: string;
  details: string | null;
  occurred_at: string;
  performed_by: string | null;
  purchase_value: number | null;
}

export interface FrequentlyPurchasedProduct {
  product_id: string;
  product_name: string;
  total_quantity: number;
}

export interface CustomerPurchaseHistory {
  sales: Sale[];
  total: number;
  page: number;
  pageSize: number;
  frequentlyPurchasedProducts: FrequentlyPurchasedProduct[];
}

export interface CustomerAnalyticsKpis {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageCustomerSpend: number;
  totalRevenueGenerated: number;
  averagePurchaseFrequency: number;
}

export interface CustomerGrowthPoint {
  month: string;
  newCustomers: number;
  cumulativeCustomers: number;
}

export interface NewVsReturningPoint {
  month: string;
  new: number;
  returning: number;
}

export interface RevenueByTypePoint {
  customerType: string;
  revenue: number;
}

export interface TopCustomerRow {
  customerId: string;
  customerCode: string;
  name: string;
  revenue: number;
  totalOrders: number;
  favoriteProduct: string | null;
}

export interface BucketCount {
  bucket: string;
  count: number;
}

export interface LocationCount {
  location: string;
  count: number;
}

export interface MonthlyAcquisitionPoint {
  month: string;
  count: number;
}

export interface CustomerAnalyticsOverview {
  kpis: CustomerAnalyticsKpis;
  growthTrend: CustomerGrowthPoint[];
  newVsReturning: NewVsReturningPoint[];
  revenueByType: RevenueByTypePoint[];
  topCustomers: TopCustomerRow[];
  purchaseFrequency: BucketCount[];
  locationDistribution: LocationCount[];
  monthlyAcquisition: MonthlyAcquisitionPoint[];
  spendingDistribution: BucketCount[];
}

export interface RecentCustomerRow {
  customerId: string;
  customerCode: string;
  name: string;
  customerType: CustomerType;
  createdAt: string;
}

export interface CustomerInsights {
  topCustomers: TopCustomerRow[];
  recentCustomers: RecentCustomerRow[];
  customerGrowth: CustomerGrowthPoint[];
  customerRevenueContribution: RevenueByTypePoint[];
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
