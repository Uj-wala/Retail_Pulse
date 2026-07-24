import { axiosClient } from "./axios";
import type { Notification } from "../types";

export const notificationApi = {
  listNotifications: () =>
    axiosClient.get<{ notifications: Notification[]; total: number }>("/notifications").then((res) => res.data),
};
