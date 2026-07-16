import { axiosClient } from "./axios";
import type { InventoryTransaction, InventoryTransactionType } from "../types";

export interface CreateInventoryTransactionPayload {
  productId: string;
  type: InventoryTransactionType;
  quantity: number;
  note?: string;
}

export const inventoryApi = {
  listTransactions: (productId?: string) =>
    axiosClient
      .get<{ transactions: InventoryTransaction[]; total: number }>("/inventory", {
        params: productId ? { productId } : undefined,
      })
      .then((res) => res.data),

  createTransaction: (payload: CreateInventoryTransactionPayload) =>
    axiosClient
      .post<{ transaction: InventoryTransaction }>("/inventory", payload)
      .then((res) => res.data),
};
