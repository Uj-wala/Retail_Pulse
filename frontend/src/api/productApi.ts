import { axiosClient } from "./axios";
import type { Product } from "../types";

export interface ProductPayload {
  categoryId: string;
  sku: string;
  name: string;
  brand?: string;
  description?: string;
  unitPrice: number;
  costPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  unitOfMeasure: string;
  isActive: boolean;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  brand?: string;
  sort?: "name" | "-name" | "unitPrice" | "-unitPrice" | "recent";
  page?: number;
  pageSize?: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export const productApi = {
  listProducts: (filters: ProductFilters = {}) =>
    axiosClient.get<ProductListResponse>("/products", { params: filters }).then((res) => res.data),

  getProduct: (id: string) =>
    axiosClient.get<{ product: Product }>(`/products/${id}`).then((res) => res.data),

  createProduct: (payload: ProductPayload) =>
    axiosClient.post<{ product: Product }>("/products", payload).then((res) => res.data),

  updateProduct: (id: string, payload: Partial<ProductPayload>) =>
    axiosClient.patch<{ product: Product }>(`/products/${id}`, payload).then((res) => res.data),

  setProductStatus: (id: string, isActive: boolean) =>
    axiosClient.patch<{ product: Product }>(`/products/${id}/status`, { isActive }).then((res) => res.data),

  deleteProduct: (id: string) => axiosClient.delete(`/products/${id}`),

  listLowStock: () => axiosClient.get<{ products: Product[] }>("/products/low-stock").then((res) => res.data),
};
