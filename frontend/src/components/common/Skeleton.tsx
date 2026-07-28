import { cn } from "../../utils/cn";

/** Pulsing placeholder bar/box, styled to match the app's existing surface colors. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-elevated", className)} />;
}
