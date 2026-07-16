import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-brand-teal text-[#042F2E] hover:bg-brand-teal-dark",
  secondary: "bg-brand-amber text-[#3F2600] hover:brightness-95",
  outline: "border border-border/40 text-content hover:bg-surface-elevated",
  ghost: "text-content hover:bg-surface-elevated",
  danger: "bg-red-500 text-white hover:bg-red-600",
};

export function Button({
  variant = "primary",
  isLoading,
  icon,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
        "transition-transform duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        "active:scale-[0.98]",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {isLoading ? <Spinner size={16} className="text-current" /> : icon}
      {children}
    </button>
  );
}
