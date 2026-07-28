import { Children, cloneElement, isValidElement } from "react";
import type { ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes, ReactElement } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "../../utils/cn";
import { Skeleton } from "../common/Skeleton";

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

interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortDirection?: "asc" | "desc";
  /** When provided, the header renders as a clickable/keyboard-focusable sort control (like MUI's TableSortLabel). */
  onSort?: () => void;
}

export function TableHeaderCell({ children, className, sortDirection, onSort, ...rest }: TableHeaderCellProps) {
  const indicator = (
    <>
      {sortDirection === "asc" && <ArrowUp className="h-3 w-3" />}
      {sortDirection === "desc" && <ArrowDown className="h-3 w-3" />}
    </>
  );

  return (
    <th
      className={cn("px-2 py-3 font-semibold sm:px-4", sortDirection && "text-brand-teal", className)}
      aria-sort={sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : undefined}
      {...rest}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex items-center gap-1 rounded hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
        >
          {children}
          {indicator}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1">
          {children}
          {indicator}
        </span>
      )}
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

/** Placeholder rows shown while a table's data is loading, in place of a blank/spinner-only body. */
export function TableSkeletonRows({ rows, columns }: { rows: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton className="h-4 w-full max-w-[10rem]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
