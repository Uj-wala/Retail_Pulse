import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-content/10 text-content",
  success: "bg-emerald-500/15 text-emerald-500",
  warning: "bg-amber-500/15 text-amber-500",
  danger: "bg-red-500/15 text-red-500",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
