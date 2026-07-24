import { axiosClient } from "./axios";
import type {
  AdjustmentDirection,
  Inventory,
  InventoryCharts,
  InventoryMovement,
  InventorySummary,
  StockAdjustmentType,
  StockStatus,
} from "../types";

export interface InventoryFilters {
  search?: string;
  categoryId?: string;
  brand?: string;
  stockStatus?: StockStatus | "";
  sort?: "name" | "-name" | "stock" | "-stock" | "recent" | "-recent";
  page?: number;
  pageSize?: number;
}

export interface MovementFilters {
  productId?: string;
  page?: number;
  pageSize?: number;
}

export interface StockAdjustmentPayload {
  adjustmentType: StockAdjustmentType;
  direction?: AdjustmentDirection;
  quantity: number;
  reason: string;
  remarks?: string;
}

export const inventoryApi = {
  listInventory: (filters: InventoryFilters = {}) =>
    axiosClient
      .get<{ items: Inventory[]; total: number; page: number; pageSize: number }>("/inventory", {
        params: filters,
      })
      .then((res) => res.data),

  getSummary: () => axiosClient.get<InventorySummary>("/inventory/summary").then((res) => res.data),

  getCharts: () => axiosClient.get<InventoryCharts>("/inventory/charts").then((res) => res.data),

  listMovements: (filters: MovementFilters = {}) =>
    axiosClient
      .get<{ items: InventoryMovement[]; total: number; page: number; pageSize: number }>("/inventory/movements", {
        params: filters,
      })
      .then((res) => res.data),

  adjustStock: (inventoryId: string, payload: StockAdjustmentPayload) =>
    axiosClient
      .post<{ movement: InventoryMovement }>(`/inventory/${inventoryId}/adjust`, payload)
      .then((res) => res.data),

  updateReorderLevel: (inventoryId: string, reorderLevel: number) =>
    axiosClient
      .patch<{ inventory: Inventory }>(`/inventory/${inventoryId}/reorder-level`, { reorderLevel })
      .then((res) => res.data),
};
