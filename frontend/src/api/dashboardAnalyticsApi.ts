import { axiosClient } from "./axios";
import type {
  DashboardCategoryDrilldown,
  DashboardFilterOptions,
  DashboardFilterValues,
  DashboardGranularity,
  DashboardKpiDrilldown,
  DashboardKpiKey,
  DashboardOverview,
  DashboardProductDrilldown,
} from "../types";

function filterParams(filters: DashboardFilterValues) {
  return {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    productId: filters.productId || undefined,
    categoryId: filters.categoryId || undefined,
    brand: filters.brand || undefined,
    salesChannel: filters.salesChannel || undefined,
    paymentMethod: filters.paymentMethod || undefined,
  };
}

export const dashboardAnalyticsApi = {
  getOverview: (filters: DashboardFilterValues, granularity: DashboardGranularity = "daily") =>
    axiosClient
      .get<DashboardOverview>("/analytics/dashboard/overview", { params: { ...filterParams(filters), granularity } })
      .then((res) => res.data),

  getFilterOptions: () =>
    axiosClient.get<DashboardFilterOptions>("/analytics/dashboard/filter-options").then((res) => res.data),

  getKpiDrilldown: (kpi: DashboardKpiKey, filters: DashboardFilterValues) =>
    axiosClient
      .get<DashboardKpiDrilldown>(`/analytics/dashboard/drilldown/kpi/${kpi}`, { params: filterParams(filters) })
      .then((res) => res.data),

  getCategoryDrilldown: (categoryId: string, filters: DashboardFilterValues) =>
    axiosClient
      .get<DashboardCategoryDrilldown>(`/analytics/dashboard/drilldown/category/${categoryId}`, {
        params: filterParams(filters),
      })
      .then((res) => res.data),

  getProductDrilldown: (productId: string, filters: DashboardFilterValues) =>
    axiosClient
      .get<DashboardProductDrilldown>(`/analytics/dashboard/drilldown/product/${productId}`, {
        params: filterParams(filters),
      })
      .then((res) => res.data),

  exportCsv: (section: "kpis" | "sales" | "inventory", filters: DashboardFilterValues) =>
    axiosClient
      .get(`/analytics/dashboard/export/csv`, { params: { ...filterParams(filters), section }, responseType: "blob" })
      .then((res) => res.data as Blob),

  exportPdf: (section: "kpis" | "sales" | "inventory", filters: DashboardFilterValues) =>
    axiosClient
      .get(`/analytics/dashboard/export/pdf`, { params: { ...filterParams(filters), section }, responseType: "blob" })
      .then((res) => res.data as Blob),

  logAuditEvent: (action: "viewed" | "filters_applied", filters?: DashboardFilterValues) =>
    axiosClient.post("/analytics/dashboard/audit", { action, filters }).catch(() => undefined),
};
