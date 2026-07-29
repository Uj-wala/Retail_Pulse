import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/15 bg-surface shadow-sm shadow-slate-900/5 transition-all duration-200",
        "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10 dark:shadow-black/20 dark:hover:shadow-black/50",
        className,
      )}
      {...rest}
    />
  );
}
