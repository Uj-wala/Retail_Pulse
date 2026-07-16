import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-content-muted">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-content-muted">{description}</p>}
      {action}
    </div>
  );
}
