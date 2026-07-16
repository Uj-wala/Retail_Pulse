import { axiosClient } from "./axios";
import type { Sale } from "../types";

export interface CreateSalePayload {
  customerName?: string;
  items: { productId: string; quantity: number }[];
}

export const saleApi = {
  listSales: () => axiosClient.get<{ sales: Sale[]; total: number }>("/sales").then((res) => res.data),

  getSale: (id: string) => axiosClient.get<{ sale: Sale }>(`/sales/${id}`).then((res) => res.data),

  createSale: (payload: CreateSalePayload) =>
    axiosClient.post<{ sale: Sale }>("/sales", payload).then((res) => res.data),

  refundSale: (id: string) => axiosClient.post<{ sale: Sale }>(`/sales/${id}/refund`).then((res) => res.data),
};
