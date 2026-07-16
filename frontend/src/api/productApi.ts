import { axiosClient } from "./axios";
import type { Product } from "../types";

export interface ProductPayload {
  categoryId?: string | null;
  sku: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  stockQuantity: number;
  reorderLevel: number;
  isActive: boolean;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
}

export const productApi = {
  listProducts: (filters: ProductFilters = {}) =>
    axiosClient
      .get<{ products: Product[]; total: number }>("/products", { params: filters })
      .then((res) => res.data),

  getProduct: (id: string) =>
    axiosClient.get<{ product: Product }>(`/products/${id}`).then((res) => res.data),

  createProduct: (payload: ProductPayload) =>
    axiosClient.post<{ product: Product }>("/products", payload).then((res) => res.data),

  updateProduct: (id: string, payload: Partial<ProductPayload>) =>
    axiosClient.patch<{ product: Product }>(`/products/${id}`, payload).then((res) => res.data),

  deleteProduct: (id: string) => axiosClient.delete(`/products/${id}`),

  listLowStock: () => axiosClient.get<{ products: Product[] }>("/products/low-stock").then((res) => res.data),
};
