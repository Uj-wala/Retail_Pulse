import { axiosClient } from "./axios";
import type { Category } from "../types";

export interface CategoryPayload {
  name: string;
  description?: string;
}

export const categoryApi = {
  listCategories: () =>
    axiosClient.get<{ categories: Category[]; total: number }>("/categories").then((res) => res.data),

  createCategory: (payload: CategoryPayload) =>
    axiosClient.post<{ category: Category }>("/categories", payload).then((res) => res.data),

  updateCategory: (id: string, payload: Partial<CategoryPayload>) =>
    axiosClient.patch<{ category: Category }>(`/categories/${id}`, payload).then((res) => res.data),

  deleteCategory: (id: string) => axiosClient.delete(`/categories/${id}`),
};
