import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Users, Search, Eye, Download, FileText, Power } from "lucide-react";
import { customerApi, SEGMENT_LABEL, type CustomerFilters, type CustomerPayload } from "../../api/customerApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { Pagination } from "../../components/common/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatCurrency, formatDate } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { CustomerFormModal } from "./CustomerFormModal";
import { CustomerAnalyticsDashboard } from "./CustomerAnalyticsDashboard";
import { CustomerAuditLogsPanel } from "./CustomerAuditLogsPanel";
import type { Customer, CustomerSegment } from "../../types";
import type { CustomerFormValues } from "./customerSchema";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN"];
const PAGE_SIZE = 10;
const DEFAULT_SORT: NonNullable<CustomerFilters["sort"]> = "-customerSince";

const SORT_OPTIONS: { value: NonNullable<CustomerFilters["sort"]>; label: string }[] = [
  { value: "name", label: "Name A-Z" },
  { value: "-name", label: "Name Z-A" },
  { value: "-totalSpend", label: "Highest Spend" },
  { value: "totalSpend", label: "Lowest Spend" },
  { value: "-totalOrders", label: "Highest Orders" },
  { value: "totalOrders", label: "Lowest Orders" },
  { value: "-lastPurchase", label: "Latest Purchase" },
  { value: "lastPurchase", label: "Oldest Purchase" },
  { value: "-customerSince", label: "Newest Customer" },
  { value: "customerSince", label: "Oldest Customer" },
];
const VALID_SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value));

function isValidSort(value: string | null): value is NonNullable<CustomerFilters["sort"]> {
  return !!value && VALID_SORT_VALUES.has(value as NonNullable<CustomerFilters["sort"]>);
}

const SEGMENT_TONE: Record<CustomerSegment, "neutral" | "success" | "warning" | "danger"> = {
  NEW: "neutral",
  REGULAR: "success",
  LOYAL: "warning",
  VIP: "danger",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Customers API is not reachable. Start the backend server and try again.";
  }
  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMessage = (data.detail[0] as { msg?: unknown })?.msg;
    if (typeof firstMessage === "string") return firstMessage;
  }
  return fallback;
}

function toPayload(values: CustomerFormValues): CustomerPayload {
  return {
    fullName: values.fullName,
    email: values.email,
    phone: values.phone,
    customerType: values.customerType,
    dateOfBirth: values.dateOfBirth || undefined,
    gender: values.gender || undefined,
    address: values.address,
    city: values.city,
    state: values.state,
    country: values.country,
    postalCode: values.postalCode || undefined,
    preferredChannel: values.preferredChannel || undefined,
    isActive: values.isActive,
  };
}

function sortDirFor(sort: string | undefined, field: string): "asc" | "desc" | undefined {
  if (sort === field) return "asc";
  if (sort === `-${field}`) return "desc";
  return undefined;
}

/** Clicking an unsorted header sorts ascending; clicking again reverses; a third click clears back to the default order. */
function nextSort(current: string | undefined, field: string): CustomerFilters["sort"] {
  if (current === field) return `-${field}` as CustomerFilters["sort"];
  if (current === `-${field}`) return DEFAULT_SORT;
  return field as CustomerFilters["sort"];
}

export function CustomersPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);
  const canViewAnalytics = !!user && ["COMPANY_ADMIN", "SUPER_ADMIN", "ANALYST"].includes(user.role);

  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<"directory" | "analytics" | "auditLogs">("directory");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [city, setCity] = useState("");
  const [registeredAfter, setRegisteredAfter] = useState("");
  const [registeredBefore, setRegisteredBefore] = useState("");
  const [sort, setSort] = useState<CustomerFilters["sort"]>(() => {
    const fromUrl = searchParams.get("sort");
    return isValidSort(fromUrl) ? fromUrl : DEFAULT_SORT;
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("sort", sort ?? DEFAULT_SORT);
        return next;
      },
      { replace: true },
    );
  }, [sort, setSearchParams]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

  const filters: CustomerFilters = {
    search: debouncedSearch || undefined,
    customerType: (customerType || undefined) as CustomerFilters["customerType"],
    isActive: statusFilter === "" ? undefined : statusFilter === "active",
    city: city || undefined,
    registeredAfter: registeredAfter || undefined,
    registeredBefore: registeredBefore || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const customersQuery = useQuery({
    queryKey: ["customers", filters],
    queryFn: () => customerApi.listCustomers(filters),
    enabled: tab === "directory",
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);
  const locationsQuery = useQuery({
    queryKey: ["customer-locations"],
    queryFn: () => customerApi.listLocations(),
  });

  const invalidateCustomerQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["customer-locations"] });
    queryClient.invalidateQueries({ queryKey: ["customer-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const createMutation = useMutation({
    mutationFn: customerApi.createCustomer,
    onSuccess: () => {
      invalidateCustomerQueries();
      notify("Customer created");
      setFormOpen(false);
    },
    onError: (error) => notify(getApiErrorMessage(error, "Could not create customer. Please try again."), "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerPayload }) => customerApi.updateCustomer(id, payload),
    onSuccess: () => {
      invalidateCustomerQueries();
      notify("Customer updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (error) => notify(getApiErrorMessage(error, "Could not update customer. Please try again."), "error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => customerApi.setCustomerStatus(id, isActive),
    onSuccess: (_, variables) => {
      invalidateCustomerQueries();
      notify(variables.isActive ? "Customer activated" : "Customer deactivated");
    },
    onError: (error) => notify(getApiErrorMessage(error, "Could not update customer status. Please try again."), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.deleteCustomer(id),
    onSuccess: () => {
      invalidateCustomerQueries();
      notify("Customer deleted");
      setDeleting(null);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not delete customer. Please try again."), "error");
      setDeleting(null);
    },
  });

  async function handleExportList(format: "csv" | "pdf") {
    setIsExporting(format);
    try {
      const blob = format === "csv" ? await customerApi.exportCsv("customer-list") : await customerApi.exportPdf("customer-list");
      downloadBlob(blob, `customer-list.${format}`);
    } catch (error) {
      notify(getApiErrorMessage(error, "Could not export the customer list."), "error");
    } finally {
      setIsExporting(null);
    }
  }

  const customers = customersQuery.data?.customers ?? [];
  const locations = locationsQuery.data?.locations ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-sm text-content-muted">Manage customer profiles, purchase history, and segmentation.</p>
        </div>
        {tab === "directory" && canManage && (
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Customer
          </Button>
        )}
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-border/25 bg-surface p-1 text-sm font-semibold w-fit">
        <button
          type="button"
          onClick={() => setTab("directory")}
          className={`rounded-md px-4 py-2 transition-colors ${tab === "directory" ? "bg-brand-teal text-[#042F2E]" : "text-content-muted hover:text-content"}`}
        >
          Directory
        </button>
        {canViewAnalytics && (
          <button
            type="button"
            onClick={() => setTab("analytics")}
            className={`rounded-md px-4 py-2 transition-colors ${tab === "analytics" ? "bg-brand-teal text-[#042F2E]" : "text-content-muted hover:text-content"}`}
          >
            Analytics
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={() => setTab("auditLogs")}
            className={`rounded-md px-4 py-2 transition-colors ${tab === "auditLogs" ? "bg-brand-teal text-[#042F2E]" : "text-content-muted hover:text-content"}`}
          >
            Audit Logs
          </button>
        )}
      </div>

      {tab === "analytics" ? (
        <CustomerAnalyticsDashboard />
      ) : tab === "auditLogs" ? (
        <CustomerAuditLogsPanel />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-wrap sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, customer ID, email, or phone"
                className="w-full rounded-lg border border-border/25 bg-surface py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
              />
            </div>
            <select
              value={customerType}
              onChange={(event) => {
                setCustomerType(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
            >
              <option value="">All Types</option>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="CORPORATE">Corporate</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
            >
              <option value="">All Cities</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as CustomerFilters["sort"]);
                setPage(1);
              }}
              className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
            >
              {SORT_OPTIONS.map((option) => (
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
                  value={registeredAfter}
                  onChange={(event) => {
                    setRegisteredAfter(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-border/25 bg-surface px-2 py-2 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                />
              </label>
              <label className="flex items-center gap-1">
                To
                <input
                  type="date"
                  value={registeredBefore}
                  onChange={(event) => {
                    setRegisteredBefore(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-border/25 bg-surface px-2 py-2 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                />
              </label>
            </div>
            {canViewAnalytics && (
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  variant="outline"
                  icon={<Download className="h-4 w-4" />}
                  isLoading={isExporting === "csv"}
                  onClick={() => handleExportList("csv")}
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  icon={<FileText className="h-4 w-4" />}
                  isLoading={isExporting === "pdf"}
                  onClick={() => handleExportList("pdf")}
                >
                  PDF
                </Button>
              </div>
            )}
          </div>

          {customersQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size={28} />
            </div>
          ) : customers.length === 0 ? (
            <EmptyState icon={<Users className="h-10 w-10" />} title="No customers found" description="Add your first customer to start tracking purchase history and segmentation." />
          ) : (
            <Table fixed>
              <colgroup>
                <col style={{ width: "8%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <TableHead>
                <tr>
                  <TableHeaderCell compact sortDirection={sortDirFor(sort, "customerId")} onSort={() => { setSort(nextSort(sort, "customerId")); setPage(1); }}>
                    Customer ID
                  </TableHeaderCell>
                  <TableHeaderCell compact sortDirection={sortDirFor(sort, "name")} onSort={() => { setSort(nextSort(sort, "name")); setPage(1); }}>
                    Name
                  </TableHeaderCell>
                  <TableHeaderCell compact>Contact</TableHeaderCell>
                  <TableHeaderCell compact>Type</TableHeaderCell>
                  <TableHeaderCell compact>Segment</TableHeaderCell>
                  <TableHeaderCell compact sortDirection={sortDirFor(sort, "totalOrders")} onSort={() => { setSort(nextSort(sort, "totalOrders")); setPage(1); }}>
                    Orders
                  </TableHeaderCell>
                  <TableHeaderCell compact sortDirection={sortDirFor(sort, "totalSpend")} onSort={() => { setSort(nextSort(sort, "totalSpend")); setPage(1); }}>
                    Total Spend
                  </TableHeaderCell>
                  <TableHeaderCell compact sortDirection={sortDirFor(sort, "lastPurchase")} onSort={() => { setSort(nextSort(sort, "lastPurchase")); setPage(1); }}>
                    Last Purchase
                  </TableHeaderCell>
                  <TableHeaderCell compact sortDirection={sortDirFor(sort, "customerSince")} onSort={() => { setSort(nextSort(sort, "customerSince")); setPage(1); }}>
                    Customer Since
                  </TableHeaderCell>
                  <TableHeaderCell compact>Status</TableHeaderCell>
                  <TableHeaderCell compact className="text-center">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                    <TableCell compact className="font-mono text-content-muted">
                      <span className="block truncate">{customer.customer_code}</span>
                    </TableCell>
                    <TableCell compact className="font-semibold">
                      <span className="block truncate">{customer.full_name}</span>
                    </TableCell>
                    <TableCell compact className="leading-tight text-content-muted">
                      <span className="block truncate">{customer.email}</span>
                      <span className="block truncate">{customer.phone}</span>
                    </TableCell>
                    <TableCell compact className="text-content-muted">
                      <span className="block truncate">{customer.customer_type}</span>
                    </TableCell>
                    <TableCell compact>
                      <Badge tone={SEGMENT_TONE[customer.summary.segment]}>{SEGMENT_LABEL[customer.summary.segment]}</Badge>
                    </TableCell>
                    <TableCell compact>{customer.summary.total_orders}</TableCell>
                    <TableCell compact>
                      <span className="block truncate">{formatCurrency(customer.summary.total_revenue)}</span>
                    </TableCell>
                    <TableCell compact className="text-content-muted">
                      <span className="block truncate">{formatDate(customer.summary.last_purchase_date)}</span>
                    </TableCell>
                    <TableCell compact className="text-content-muted">
                      <span className="block truncate">{formatDate(customer.created_at)}</span>
                    </TableCell>
                    <TableCell compact>{customer.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}</TableCell>
                    <TableCell compact>
                      <div className="flex items-center justify-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="icon-action-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content hover:bg-surface-elevated hover:text-brand-teal"
                          title="View profile"
                        >
                          <Eye className="h-4 w-4 shrink-0" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => statusMutation.mutate({ id: customer.id, isActive: !customer.is_active })}
                              className={`icon-action-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-surface-elevated ${
                                customer.is_active ? "text-content hover:text-amber-500" : "text-content-muted hover:text-emerald-500"
                              }`}
                              title={customer.is_active ? "Deactivate" : "Activate"}
                            >
                              <Power className="h-4 w-4 shrink-0" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(customer);
                                setFormOpen(true);
                              }}
                              className="icon-action-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content hover:bg-surface-elevated hover:text-brand-teal"
                              title="Edit customer"
                            >
                              <Pencil className="h-4 w-4 shrink-0" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(customer)}
                              className="icon-action-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content hover:bg-red-500/10 hover:text-red-500"
                              title="Delete customer"
                            >
                              <Trash2 className="h-4 w-4 shrink-0" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {customersQuery.data && (
            <Pagination page={page} pageSize={customersQuery.data.pageSize} total={customersQuery.data.total} onPageChange={setPage} />
          )}

          <CustomerFormModal
            open={formOpen}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            initial={editing}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onSubmit={(values) => {
              const payload = toPayload(values);
              if (editing) {
                updateMutation.mutate({ id: editing.id, payload });
              } else {
                createMutation.mutate(payload);
              }
            }}
          />

          <ConfirmDialog
            open={!!deleting}
            title="Delete Customer"
            message={`Are you sure you want to delete "${deleting?.full_name}"? This cannot be undone. Customers with purchase history cannot be deleted - deactivate them instead.`}
            confirmLabel="Delete"
            isLoading={deleteMutation.isPending}
            onCancel={() => setDeleting(null)}
            onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
          />
        </>
      )}
    </div>
  );
}
