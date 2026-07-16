import { axiosClient } from "./axios";
import type { InventoryReport, SalesReport } from "../types";

export const reportApi = {
  getSalesReport: (from?: string, to?: string) =>
    axiosClient
      .get<SalesReport>("/reports/sales", { params: { from, to } })
      .then((res) => res.data),

  getInventoryReport: () =>
    axiosClient.get<InventoryReport>("/reports/inventory").then((res) => res.data),
};
