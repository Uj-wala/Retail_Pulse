import { axiosClient } from "./axios";
import type { Notification } from "../types";

export const notificationApi = {
  listNotifications: () =>
    axiosClient
      .get<{ notifications: Notification[]; total: number; unreadCount: number }>("/notifications")
      .then((res) => res.data),
  setRead: (id: string, isRead: boolean) =>
    axiosClient.patch<{ notification: Notification }>(`/notifications/${id}/read`, { isRead }).then((res) => res.data),
  markAllRead: () => axiosClient.patch<{ updated: number }>("/notifications/read-all").then((res) => res.data),
};
