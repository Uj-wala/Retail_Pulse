import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className }: SpinnerProps) {
  return <Loader2 className={cn("animate-spin text-brand-teal", className)} size={size} />;
}
