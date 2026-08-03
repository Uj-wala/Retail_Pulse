import { axiosClient } from "./axios";
import type {
  ActivityLogEntry,
  Customer,
  CustomerAnalyticsOverview,
  CustomerProfile,
  CustomerPurchaseHistory,
  CustomerSegment,
  CustomerTimelineEntry,
  CustomerType,
  Gender,
  SalesChannel,
} from "../types";

export interface CustomerPayload {
  fullName: string;
  email: string;
  phone: string;
  customerType: CustomerType;
  dateOfBirth?: string;
  gender?: Gender;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  preferredChannel?: SalesChannel;
  isActive: boolean;
}

export interface CustomerFilters {
  search?: string;
  customerType?: CustomerType;
  isActive?: boolean;
  city?: string;
  state?: string;
  country?: string;
  registeredAfter?: string;
  registeredBefore?: string;
  sort?: "customerId" | "-customerId" | "name" | "-name" | "totalSpend" | "-totalSpend" | "totalOrders" | "-totalOrders" | "lastPurchase" | "-lastPurchase" | "customerSince" | "-customerSince" | "recent";
  page?: number;
  pageSize?: number;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerAnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  customerType?: CustomerType;
  city?: string;
  state?: string;
  country?: string;
}

export type CustomerExportSection = "customer-list" | "customer-analytics" | "top-customers";

export interface AuditLogFilters {
  action?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogListResponse {
  auditLogs: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export const customerApi = {
  listCustomers: (filters: CustomerFilters = {}) =>
    axiosClient.get<CustomerListResponse>("/customers", { params: filters }).then((res) => res.data),

  getCustomer: (id: string) =>
    axiosClient.get<{ customer: CustomerProfile }>(`/customers/${id}`).then((res) => res.data.customer),

  createCustomer: (payload: CustomerPayload) =>
    axiosClient.post<{ customer: Customer }>("/customers", payload).then((res) => res.data),

  updateCustomer: (id: string, payload: Partial<CustomerPayload>) =>
    axiosClient.patch<{ customer: Customer }>(`/customers/${id}`, payload).then((res) => res.data),

  setCustomerStatus: (id: string, isActive: boolean) =>
    axiosClient.patch<{ customer: Customer }>(`/customers/${id}/status`, { isActive }).then((res) => res.data),

  deleteCustomer: (id: string) => axiosClient.delete(`/customers/${id}`),

  listLocations: () => axiosClient.get<{ locations: string[] }>("/customers/locations").then((res) => res.data),

  getPurchaseHistory: (id: string, page = 1, pageSize = 20) =>
    axiosClient
      .get<CustomerPurchaseHistory>(`/customers/${id}/purchase-history`, { params: { page, pageSize } })
      .then((res) => res.data),

  getTimeline: (id: string) =>
    axiosClient.get<{ timeline: CustomerTimelineEntry[] }>(`/customers/${id}/timeline`).then((res) => res.data.timeline),

  getRecentActivity: (id: string, limit = 10) =>
    axiosClient
      .get<{ activities: CustomerTimelineEntry[] }>(`/customers/${id}/recent-activity`, { params: { limit } })
      .then((res) => res.data.activities),

  getAnalyticsOverview: (filters: CustomerAnalyticsFilters = {}) =>
    axiosClient.get<CustomerAnalyticsOverview>("/customers/analytics/overview", { params: filters }).then((res) => res.data),

  exportCsv: (section: CustomerExportSection, filters: CustomerAnalyticsFilters = {}) =>
    axiosClient
      .get("/customers/analytics/export/csv", { params: { ...filters, section }, responseType: "blob" })
      .then((res) => res.data as Blob),

  exportPdf: (section: CustomerExportSection, filters: CustomerAnalyticsFilters = {}) =>
    axiosClient
      .get("/customers/analytics/export/pdf", { params: { ...filters, section }, responseType: "blob" })
      .then((res) => res.data as Blob),

  getAuditLogs: (filters: AuditLogFilters = {}) =>
    axiosClient
      .get<AuditLogListResponse>("/customers/audit-logs", { params: filters, paramsSerializer: { indexes: null } })
      .then((res) => res.data),

  exportAuditLogsCsv: (filters: AuditLogFilters = {}) =>
    axiosClient
      .get("/customers/audit-logs/export/csv", { params: filters, paramsSerializer: { indexes: null }, responseType: "blob" })
      .then((res) => res.data as Blob),
};

export const SEGMENT_LABEL: Record<CustomerSegment, string> = {
  NEW: "New",
  REGULAR: "Regular",
  LOYAL: "Loyal",
  VIP: "VIP",
};
