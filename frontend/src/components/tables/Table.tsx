import { Children, cloneElement, isValidElement } from "react";
import type { ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes, ReactElement } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { Skeleton } from "../common/Skeleton";

interface TableProps {
  children: React.ReactNode;
  className?: string;
  tableClassName?: string;
  /** Set false to disable the horizontal-scroll wrapper, e.g. when columns use fixed % widths sized to fit the viewport. */
  scroll?: boolean;
  /** Uses table-layout: fixed so <col> widths (via a <colgroup>) are respected instead of sizing to content. */
  fixed?: boolean;
}

export function Table({ children, className, tableClassName, scroll = true, fixed = false }: TableProps) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/15",
        scroll && "overflow-x-auto [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <table className={cn("w-full border-collapse text-left text-xs sm:text-sm", fixed && "table-fixed", tableClassName)}>
        {children}
      </table>
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
  /** Tighter padding/type scale for dense, fixed-width tables that must fit within a fixed viewport without scrolling. */
  compact?: boolean;
}

export function TableHeaderCell({ children, className, sortDirection, onSort, compact, ...rest }: TableHeaderCellProps) {
  const indicator = (
    <>
      {sortDirection === "asc" && <ArrowUp className="h-3 w-3 shrink-0" />}
      {sortDirection === "desc" && <ArrowDown className="h-3 w-3 shrink-0" />}
      {!sortDirection && onSort && <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />}
    </>
  );

  return (
    <th
      className={cn(
        "whitespace-nowrap overflow-hidden font-semibold",
        compact ? "px-2 py-2.5 text-[13px]" : "px-1.5 py-2.5 sm:px-2.5",
        sortDirection && "text-brand-teal",
        className,
      )}
      aria-sort={sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : undefined}
      {...rest}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex max-w-full items-center gap-1 rounded hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
        >
          <span className="truncate">{children}</span>
          {indicator}
        </button>
      ) : (
        <span className="inline-flex max-w-full items-center gap-1">
          <span className="truncate">{children}</span>
          {indicator}
        </span>
      )}
    </th>
  );
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Tighter padding/type scale for dense, fixed-width tables that must fit within a fixed viewport without scrolling. */
  compact?: boolean;
}

export function TableCell({ children, className, compact, ...rest }: TableCellProps) {
  return (
    <td
      className={cn("align-middle overflow-hidden", compact ? "px-2 py-2.5 text-[13px]" : "px-1.5 py-2.5 sm:px-2.5", className)}
      {...rest}
    >
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
