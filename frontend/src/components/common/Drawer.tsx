import type { ReactNode } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 h-full w-full max-w-xs sm:max-w-md overflow-y-auto border-l border-border/15 bg-surface p-4 sm:p-6 shadow-2xl animate-[drawerIn_220ms_ease] [-webkit-overflow-scrolling:touch]">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-base font-bold sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="icon-action-btn shrink-0 rounded-lg p-1 text-content-muted hover:bg-surface-elevated hover:text-content"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
