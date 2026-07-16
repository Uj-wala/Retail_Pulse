import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "../utils/cn";

export type NotificationSeverity = "success" | "error";

interface Notification {
  id: number;
  message: string;
  severity: NotificationSeverity;
}

interface NotificationContextValue {
  notify: (message: string, severity?: NotificationSeverity) => void;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

let nextId = 1;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, severity: NotificationSeverity = "success") => {
      const id = nextId++;
      setNotifications((current) => [...current, { id, message, severity }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo<NotificationContextValue>(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg backdrop-blur",
              "bg-surface-elevated text-content min-w-[260px] animate-[toastIn_180ms_ease]",
              item.severity === "success" ? "border-brand-teal/40" : "border-red-500/40",
            )}
          >
            {item.severity === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-teal" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-red-500" />
            )}
            <span className="flex-1 text-sm font-medium">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-content-muted hover:text-content"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
