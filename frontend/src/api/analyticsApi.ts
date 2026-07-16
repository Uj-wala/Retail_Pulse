import { axiosClient } from "./axios";
import type { AnalyticsSummary, CategoryRevenue, RevenuePoint, TopProduct } from "../types";

export const analyticsApi = {
  getSummary: () => axiosClient.get<AnalyticsSummary>("/analytics/summary").then((res) => res.data),

  getRevenueOverTime: (days = 30) =>
    axiosClient
      .get<{ series: RevenuePoint[] }>("/analytics/revenue", { params: { days } })
      .then((res) => res.data.series),

  getTopProducts: (limit = 5) =>
    axiosClient
      .get<{ products: TopProduct[] }>("/analytics/top-products", { params: { limit } })
      .then((res) => res.data.products),

  getSalesByCategory: () =>
    axiosClient
      .get<{ categories: CategoryRevenue[] }>("/analytics/sales-by-category")
      .then((res) => res.data.categories),
};
