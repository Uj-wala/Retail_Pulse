import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

export function Modal({ open, onClose, title, children, maxWidthClassName = "max-w-lg" }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto overflow-x-hidden p-4 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${maxWidthClassName} max-h-[95vh] overflow-y-auto rounded-xl border border-border/15 bg-surface p-4 sm:p-6 shadow-2xl animate-[modalIn_180ms_ease]`}
      >
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
