import { axiosClient } from "./axios";
import type { ProfileResponse, User } from "../types";

export const profileApi = {
  getProfile: () => axiosClient.get<ProfileResponse>("/profile").then((res) => res.data),

  updateProfile: (payload: { name?: string }) =>
    axiosClient.patch<{ user: User }>("/profile", payload).then((res) => res.data),
};
