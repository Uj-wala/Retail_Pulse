export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "ANALYST" | "VIEWER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type InventoryTransactionType = "RESTOCK" | "SALE" | "ADJUSTMENT" | "RETURN";
export type SaleStatus = "COMPLETED" | "REFUNDED" | "CANCELLED";

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

export interface Category {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  category_id: string | null;
  category_name: string | null;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  stock_quantity: number;
  reorder_level: number;
  is_active: boolean;
  low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  product_name: string | null;
  type: InventoryTransactionType;
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  company_id: string;
  user_id: string;
  cashier_name: string | null;
  customer_name: string | null;
  status: SaleStatus;
  total_amount: number;
  items: SaleItem[];
  created_at: string;
}

export interface AnalyticsSummary {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  low_stock_count: number;
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
