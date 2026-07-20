import { axiosClient } from "./axios";
import type { Category } from "../types";

export interface CategoryPayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface CategoryFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
  page: number;
  pageSize: number;
}

export const categoryApi = {
  listCategories: (filters: CategoryFilters = {}) =>
    axiosClient.get<CategoryListResponse>("/categories", { params: filters }).then((res) => res.data),

  getCategory: (id: string) =>
    axiosClient.get<{ category: Category }>(`/categories/${id}`).then((res) => res.data),

  createCategory: (payload: CategoryPayload) =>
    axiosClient.post<{ category: Category }>("/categories", payload).then((res) => res.data),

  updateCategory: (id: string, payload: Partial<CategoryPayload>) =>
    axiosClient.patch<{ category: Category }>(`/categories/${id}`, payload).then((res) => res.data),

  deleteCategory: (id: string) => axiosClient.delete(`/categories/${id}`),
};
