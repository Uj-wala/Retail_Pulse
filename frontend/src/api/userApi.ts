import { axiosClient } from "./axios";
import type { User, UserRole, UserStatus } from "../types";

export interface InviteUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export const userApi = {
  listUsers: () => axiosClient.get<{ users: User[]; total: number }>("/users").then((res) => res.data),

  inviteUser: (payload: InviteUserPayload) =>
    axiosClient.post<{ user: User }>("/users", payload).then((res) => res.data),

  updateUser: (id: string, payload: UpdateUserPayload) =>
    axiosClient.patch<{ user: User }>(`/users/${id}`, payload).then((res) => res.data),

  deactivateUser: (id: string) =>
    axiosClient.delete<{ user: User }>(`/users/${id}`).then((res) => res.data),
};
