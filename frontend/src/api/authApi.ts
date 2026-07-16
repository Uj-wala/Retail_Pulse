import { axiosClient } from "./axios";
import type { TokenResponse } from "../types";

export interface RegisterCompanyPayload {
  company_name: string;
  industry: string;
  company_email: string;
  company_address: string;
  company_phone: string;
  owner_name: string;
  owner_email: string;
  password: string;
  confirm_password: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
  confirm_new_password: string;
}

export const authApi = {
  register: (payload: RegisterCompanyPayload) =>
    axiosClient.post("/auth/register", payload).then((res) => res.data),

  login: (email: string, password: string) =>
    axiosClient
      .post<TokenResponse>("/auth/login", { email, password })
      .then((res) => res.data),

  refresh: (refreshToken: string) =>
    axiosClient
      .post("/auth/refresh", { refresh_token: refreshToken })
      .then((res) => res.data),

  logout: (refreshToken: string) =>
    axiosClient.post("/auth/logout", { refresh_token: refreshToken }),

  changePassword: (payload: ChangePasswordPayload) =>
    axiosClient.post("/auth/change-password", payload).then((res) => res.data),

  forgotPassword: (email: string) =>
    axiosClient
      .post<{ message: string }>("/auth/forgot-password", { email })
      .then((res) => res.data),

  resetPassword: (payload: ResetPasswordPayload) =>
    axiosClient
      .post<{ message: string }>("/auth/reset-password", payload)
      .then((res) => res.data),
};
