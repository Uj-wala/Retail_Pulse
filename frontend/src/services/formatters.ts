import { differenceInDays, formatDistanceToNowStrict } from "date-fns";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

/**
 * "5 minutes ago" for recent timestamps, falling back to an absolute
 * "Jul 27, 2026, 11:09 AM" once the timestamp is more than a week old.
 */
export function formatRelativeDateTime(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Math.abs(differenceInDays(new Date(), date)) < 7) {
    return `${formatDistanceToNowStrict(date)} ago`;
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
