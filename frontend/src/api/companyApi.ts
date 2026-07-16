import { axiosClient } from "./axios";
import type { Company } from "../types";

export interface UpdateCompanyPayload {
  name?: string;
  industry?: string;
  address?: string;
  phone?: string;
}

export const companyApi = {
  getCompany: () => axiosClient.get<{ company: Company }>("/company").then((res) => res.data),

  updateCompany: (payload: UpdateCompanyPayload) =>
    axiosClient.patch<{ company: Company }>("/company", payload).then((res) => res.data),
};
