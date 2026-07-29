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
  primary:
    "bg-brand-teal text-[#042F2E] hover:bg-brand-teal-dark shadow-md shadow-brand-teal/20 hover:shadow-xl hover:shadow-brand-teal/40 dark:shadow-black/30 dark:hover:shadow-brand-teal/50",
  secondary:
    "bg-brand-amber text-[#3F2600] hover:brightness-95 shadow-md shadow-brand-amber/20 hover:shadow-xl hover:shadow-brand-amber/40 dark:shadow-black/30 dark:hover:shadow-brand-amber/50",
  outline:
    "border border-border/40 text-content hover:bg-surface-elevated shadow-sm hover:shadow-lg hover:shadow-slate-900/10 dark:hover:shadow-black/50",
  ghost:
    "text-content hover:bg-surface-elevated hover:shadow-lg hover:shadow-slate-900/10 dark:hover:shadow-black/50",
  danger:
    "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/40 dark:shadow-black/30 dark:hover:shadow-red-500/50",
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
        "relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-2.5 text-sm font-semibold",
        "transition-[transform,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        "hover:-translate-y-0.5 hover:scale-[1.05] active:translate-y-0 active:scale-[0.95] disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:active:scale-100 disabled:shadow-none",
        "before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent before:transition-transform before:duration-700 before:content-['']",
        "hover:before:translate-x-full",
        "[&>svg]:transition-transform [&>svg]:duration-200 hover:[&>svg]:-rotate-6 hover:[&>svg]:scale-110 active:[&>svg]:rotate-0 active:[&>svg]:scale-95",
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
