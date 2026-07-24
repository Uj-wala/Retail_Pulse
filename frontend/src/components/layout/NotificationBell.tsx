import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { Spinner } from "../common/Spinner";
import { formatDateTime } from "../../services/formatters";

const LAST_SEEN_KEY = "retailpulse.notifications.lastSeenAt";

function readLastSeen(): string {
  try {
    return localStorage.getItem(LAST_SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeLastSeen(value: string) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, value);
  } catch {
    // localStorage unavailable (private browsing, etc.) — unread count just won't persist across reloads.
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(readLastSeen);
  const containerRef = useRef<HTMLDivElement>(null);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.listNotifications(),
    refetchInterval: 60_000,
  });

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => n.created_at > lastSeenAt).length;

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

  const toggleOpen = () => {
    setOpen((value) => {
      const next = !value;
      if (next && notifications.length > 0) {
        const latest = notifications[0].created_at;
        setLastSeenAt(latest);
        writeLastSeen(latest);
      }
      return next;
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
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
          <p className="mb-2 px-1 text-sm font-bold">Notifications</p>
          {notificationsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size={22} />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-content-muted">No notifications yet</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((notification) => (
                <li key={notification.id} className="rounded-lg border border-border/15 p-2.5">
                  <p className="text-sm font-semibold">{notification.title}</p>
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
