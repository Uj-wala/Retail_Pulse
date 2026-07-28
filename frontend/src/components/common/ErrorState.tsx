import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-red-500" />
      <p className="text-sm font-semibold text-content">{title}</p>
      {description && <p className="max-w-sm text-xs text-content-muted">{description}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-border/25 bg-surface px-3 py-1.5 text-xs font-semibold text-content hover:bg-surface-elevated"
        >
          Retry
        </button>
      )}
    </div>
  );
}
