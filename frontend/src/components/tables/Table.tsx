import { Children, cloneElement, isValidElement } from "react";
import type { ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes, ReactElement } from "react";
import { cn } from "../../utils/cn";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/15 [-webkit-overflow-scrolling:touch]">
      <table className="w-full border-collapse text-left text-xs sm:text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-surface-elevated text-xs uppercase tracking-wide text-content-muted">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-border/10">
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        return cloneElement(child as ReactElement<HTMLAttributes<HTMLTableRowElement>>, {
          style: {
            ...(child.props as HTMLAttributes<HTMLTableRowElement>).style,
            animationDelay: `${index * 70}ms`,
          },
        });
      })}
    </tbody>
  );
}

export function TableRow({ children, className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "animate-[tableRowIn_360ms_ease_both] bg-surface transition-colors hover:bg-surface-elevated/60",
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ children, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-2 py-3 font-semibold sm:px-4", className)} {...rest}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-2 py-3 align-middle sm:px-4", className)} {...rest}>
      {children}
    </td>
  );
}
