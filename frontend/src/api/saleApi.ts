import { axiosClient } from "./axios";
import type { PaymentMethod, Sale, SalesChannel } from "../types";

export interface SaleItemPayload {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discount: number;
  tax: number;
}

export interface SalePayload {
  customerName?: string;
  saleDate?: string;
  salesChannel: SalesChannel;
  paymentMethod: PaymentMethod;
  items: SaleItemPayload[];
}

export interface SaleFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  salesChannel?: SalesChannel;
  paymentMethod?: PaymentMethod;
  sort?: "date" | "-date" | "invoiceNumber" | "-invoiceNumber" | "totalAmount" | "-totalAmount";
  page?: number;
  pageSize?: number;
}

export interface SaleListResponse {
  sales: Sale[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SaleSummary {
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export const saleApi = {
  listSales: (filters: SaleFilters = {}) =>
    axiosClient.get<SaleListResponse>("/sales", { params: filters }).then((res) => res.data),

  getSummary: () => axiosClient.get<SaleSummary>("/sales/summary").then((res) => res.data),

  getSale: (id: string) => axiosClient.get<{ sale: Sale }>(`/sales/${id}`).then((res) => res.data),

  createSale: (payload: SalePayload) =>
    axiosClient.post<{ sale: Sale }>("/sales", payload).then((res) => res.data),

  updateSale: (id: string, payload: SalePayload) =>
    axiosClient.patch<{ sale: Sale }>(`/sales/${id}`, payload).then((res) => res.data),

  deleteSale: (id: string) => axiosClient.delete(`/sales/${id}`),

  refundSale: (id: string) => axiosClient.post<{ sale: Sale }>(`/sales/${id}/refund`).then((res) => res.data),
};
