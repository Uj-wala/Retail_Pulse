import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, Circle, CheckCheck } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { Spinner } from "../common/Spinner";
import { formatDateTime } from "../../services/formatters";
import type { Notification } from "../../types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.listNotifications(),
    refetchInterval: 60_000,
  });

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? notifications.filter((n) => !n.is_read).length;

  const setReadMutation = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) => notificationApi.setRead(id, isRead),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      setReadMutation.mutate({ id: notification.id, isRead: true });
    }
    if (notification.customer_id) {
      setOpen(false);
      navigate(`/customers/${notification.customer_id}`);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="Notifications"
        className="icon-action-btn relative rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-border/15 bg-surface p-3 text-content shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>
          {notificationsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size={22} />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-content-muted">No notifications yet</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`rounded-lg border border-border/15 p-2.5 transition-colors ${
                    notification.customer_id ? "cursor-pointer hover:bg-surface-elevated" : ""
                  } ${!notification.is_read ? "bg-surface-elevated/40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{notification.title}</p>
                    {!notification.is_read && <Circle className="mt-1 h-2 w-2 shrink-0 fill-brand-teal text-brand-teal" />}
                  </div>
                  <p className="text-xs text-content-muted">{notification.message}</p>
                  <p className="mt-1 text-[11px] text-content-muted">{formatDateTime(notification.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
