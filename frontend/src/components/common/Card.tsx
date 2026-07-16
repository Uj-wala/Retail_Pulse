import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/15 bg-surface transition-colors duration-200",
        className,
      )}
      {...rest}
    />
  );
}
