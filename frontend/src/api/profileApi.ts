import { axiosClient } from "./axios";
import type { ActivityLogEntry, ProfileResponse, User } from "../types";

export const profileApi = {
  getProfile: () => axiosClient.get<ProfileResponse>("/profile").then((res) => res.data),

  updateProfile: (payload: { name?: string }) =>
    axiosClient.patch<{ user: User }>("/profile", payload).then((res) => res.data),

  getActivity: (limit = 10) =>
    axiosClient
      .get<{ activity: ActivityLogEntry[] }>("/profile/activity", { params: { limit } })
      .then((res) => res.data),
};
