import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, ChevronDown, ChevronRight } from "lucide-react";
import { customerApi, type AuditLogFilters } from "../../api/customerApi";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Spinner } from "../../components/common/Spinner";
import { EmptyState } from "../../components/common/EmptyState";
import { Pagination } from "../../components/common/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatDateTime } from "../../services/formatters";
import { useNotification } from "../../hooks/useNotification";

const PAGE_SIZE = 20;

const ACTION_OPTIONS = [
  { value: "CUSTOMER_CREATED", label: "Customer Created" },
  { value: "CUSTOMER_UPDATED", label: "Customer Updated" },
  { value: "CUSTOMER_DELETED", label: "Customer Deleted" },
  { value: "CUSTOMER_ACTIVATED", label: "Activated" },
  { value: "CUSTOMER_DEACTIVATED", label: "Deactivated" },
  { value: "CUSTOMER_STATUS_CHANGED", label: "Segment Changed" },
  { value: "CUSTOMER_VIP_PROMOTED", label: "VIP Promotion" },
  { value: "CUSTOMER_EXPORTED", label: "Data Exported" },
];

const ACTION_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  CUSTOMER_CREATED: "success",
  CUSTOMER_UPDATED: "neutral",
  CUSTOMER_DELETED: "danger",
  CUSTOMER_ACTIVATED: "success",
  CUSTOMER_DEACTIVATED: "warning",
  CUSTOMER_STATUS_CHANGED: "neutral",
  CUSTOMER_VIP_PROMOTED: "warning",
  CUSTOMER_EXPORTED: "neutral",
};

function actionLabel(action: string): string {
  return ACTION_OPTIONS.find((option) => option.value === action)?.label ?? action;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CustomerAuditLogsPanel() {
  const { notify } = useNotification();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const filters: AuditLogFilters = {
    search: debouncedSearch || undefined,
    action: action ? [action] : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const logsQuery = useQuery({
    queryKey: ["customer-audit-logs", filters],
    queryFn: () => customerApi.getAuditLogs(filters),
  });

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await customerApi.exportAuditLogsCsv(filters);
      downloadBlob(blob, "customer-audit-logs.csv");
    } catch {
      notify("Could not export audit logs. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  }

  const logs = logsQuery.data?.auditLogs ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by customer name, code, or details"
            className="w-full rounded-lg border border-border/25 bg-surface py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
          />
        </div>
        <select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="">All Actions</option>
          {ACTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-xs text-content-muted">
          <label className="flex items-center gap-1">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border/25 bg-surface px-2 py-2 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
            />
          </label>
          <label className="flex items-center gap-1">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border/25 bg-surface px-2 py-2 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
            />
          </label>
        </div>
        <Button variant="outline" icon={<Download className="h-4 w-4" />} isLoading={isExporting} onClick={handleExport} className="sm:ml-auto">
          Export CSV
        </Button>
      </div>

      {logsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="No audit log entries found" description="Try adjusting your search, action filter, or date range." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell className="w-8" />
              <TableHeaderCell>Timestamp</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Performed By</TableHeaderCell>
              <TableHeaderCell>Details</TableHeaderCell>
              <TableHeaderCell>IP Address</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {logs.flatMap((log) => {
              const isOpen = expanded === log.id;
              const hasChanges = !!(log.previous_values || log.new_values);
              const rows = [
                <TableRow
                  key={log.id}
                  className={hasChanges ? "cursor-pointer" : ""}
                  onClick={() => hasChanges && setExpanded(isOpen ? null : log.id)}
                >
                  <TableCell>
                    {hasChanges && (isOpen ? <ChevronDown className="h-4 w-4 text-content-muted" /> : <ChevronRight className="h-4 w-4 text-content-muted" />)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-content-muted">{formatDateTime(log.created_at)}</TableCell>
                  <TableCell>
                    <Badge tone={ACTION_TONE[log.action] ?? "neutral"}>{actionLabel(log.action)}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{log.customer_name ?? "-"}</TableCell>
                  <TableCell className="text-content-muted">{log.performed_by ?? "System"}</TableCell>
                  <TableCell className="text-content-muted">{log.details ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs text-content-muted">{log.ip_address ?? "-"}</TableCell>
                </TableRow>,
              ];

              if (isOpen) {
                rows.push(
                  <TableRow key={`${log.id}-detail`}>
                    <TableCell />
                    <TableCell colSpan={6}>
                      <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-semibold text-content-muted">Previous Value</p>
                          <pre className="max-h-48 overflow-auto rounded-lg bg-surface-elevated p-2 text-xs">
                            {log.previous_values ? JSON.stringify(log.previous_values, null, 2) : "-"}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-semibold text-content-muted">New Value</p>
                          <pre className="max-h-48 overflow-auto rounded-lg bg-surface-elevated p-2 text-xs">
                            {log.new_values ? JSON.stringify(log.new_values, null, 2) : "-"}
                          </pre>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>,
                );
              }

              return rows;
            })}
          </TableBody>
        </Table>
      )}

      {logsQuery.data && (
        <div className="mt-4">
          <Pagination page={page} pageSize={logsQuery.data.pageSize} total={logsQuery.data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
