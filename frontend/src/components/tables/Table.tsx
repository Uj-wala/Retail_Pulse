import type { ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/15">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-surface-elevated text-xs uppercase tracking-wide text-content-muted">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border/10">{children}</tbody>;
}

export function TableRow({ children, className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("bg-surface transition-colors hover:bg-surface-elevated/60", className)} {...rest}>
      {children}
    </tr>
  );
}

export function TableHeaderCell({ children, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-4 py-3 font-semibold", className)} {...rest}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)} {...rest}>
      {children}
    </td>
  );
}
