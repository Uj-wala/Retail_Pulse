import type { ReactNode } from "react";
import { Card } from "../common/Card";
import { Skeleton } from "../common/Skeleton";

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
}

export function StatCard({ label, value, icon, hint }: StatCardProps) {
  return (
    <Card className="p-5 transition-all hover:-translate-y-0.5 hover:border-brand-teal/50 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-content-muted">{label}</p>
          <p className="mt-1 text-2xl font-extrabold">{value}</p>
        </div>
        <div className="rounded-lg bg-brand-teal/10 p-2 text-brand-teal">{icon}</div>
      </div>
      {hint && <p className="mt-2 text-xs font-semibold text-brand-teal">{hint}</p>}
    </Card>
  );
}

/** Loading placeholder shaped like StatCard, for use while its query is in flight. */
export function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="w-full">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-2.5 h-7 w-16" />
        </div>
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      </div>
    </Card>
  );
}
