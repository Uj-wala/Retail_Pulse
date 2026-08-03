import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  Pencil,
  ShoppingBag,
  Wallet,
  Clock,
  Sparkles,
  UserPlus,
  RefreshCw,
  Crown,
  Power,
  ReceiptText,
  ClipboardList,
  Trash2,
  Download,
} from "lucide-react";
import { customerApi, SEGMENT_LABEL, type CustomerPayload } from "../../api/customerApi";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Spinner } from "../../components/common/Spinner";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { Pagination } from "../../components/common/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatCurrency, formatDate, formatDateTime } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { CustomerFormModal } from "./CustomerFormModal";
import type { CustomerFormValues } from "./customerSchema";
import type { CustomerSegment } from "../../types";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN"];
const PAGE_SIZE = 10;

const SEGMENT_TONE: Record<CustomerSegment, "neutral" | "success" | "warning" | "danger"> = {
  NEW: "neutral",
  REGULAR: "success",
  LOYAL: "warning",
  VIP: "danger",
};

const TIMELINE_LABEL: Record<string, string> = {
  CUSTOMER_CREATED: "Customer registered",
  CUSTOMER_UPDATED: "Profile updated",
  CUSTOMER_ACTIVATED: "Customer reactivated",
  CUSTOMER_DEACTIVATED: "Customer deactivated",
  CUSTOMER_STATUS_CHANGED: "Segment changed",
  CUSTOMER_VIP_PROMOTED: "VIP promotion",
  CUSTOMER_EXPORTED: "Customer data exported",
  CUSTOMER_DELETED: "Customer deleted",
  FIRST_PURCHASE: "First purchase",
  PURCHASE_COMPLETED: "Purchase completed",
  LARGE_PURCHASE: "Large purchase",
};

const TIMELINE_ICON: Record<string, typeof UserPlus> = {
  CUSTOMER_CREATED: UserPlus,
  CUSTOMER_UPDATED: Pencil,
  CUSTOMER_ACTIVATED: RefreshCw,
  CUSTOMER_DEACTIVATED: Power,
  CUSTOMER_STATUS_CHANGED: Sparkles,
  CUSTOMER_VIP_PROMOTED: Crown,
  CUSTOMER_EXPORTED: Download,
  CUSTOMER_DELETED: Trash2,
  FIRST_PURCHASE: ShoppingBag,
  PURCHASE_COMPLETED: ReceiptText,
  LARGE_PURCHASE: Wallet,
};

const RECENT_ACTIVITY_ICON: Record<string, typeof UserPlus> = {
  "Customer Created": UserPlus,
  "Profile Updated": Pencil,
  "Status Changed": Power,
  "Segment Updated": Sparkles,
  "VIP Promotion": Crown,
  "Sale Completed": ShoppingBag,
};

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-content-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value || "-"}</p>
    </div>
  );
}

function productsSummary(sale: { items: { product_name: string | null; quantity: number }[] }): string {
  if (sale.items.length === 0) return "-";
  const names = sale.items.map((item) => item.product_name ?? "Unknown");
  const shown = names.slice(0, 2).join(", ");
  return names.length > 2 ? `${shown} +${names.length - 2} more` : shown;
}

function totalQuantity(sale: { items: { quantity: number }[] }): number {
  return sale.items.reduce((sum, item) => sum + item.quantity, 0);
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return "Customers API is not reachable. Start the backend server and try again.";
  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
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

function purchaseFrequencyLabel(totalOrders: number, customerSince: string): string {
  if (totalOrders === 0) return "No purchases yet";
  const months = Math.max(1, (Date.now() - new Date(customerSince).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const perMonth = totalOrders / months;
  return perMonth >= 1 ? `${perMonth.toFixed(1)} orders/month` : `${(perMonth * 12).toFixed(1)} orders/year`;
}

export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [formOpen, setFormOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"profile" | "purchases" | "timeline">("profile");

  const customerQuery = useQuery({
    queryKey: ["customer", id],
    queryFn: () => customerApi.getCustomer(id!),
    enabled: !!id,
  });
  const historyQuery = useQuery({
    queryKey: ["customer-purchase-history", id, historyPage],
    queryFn: () => customerApi.getPurchaseHistory(id!, historyPage, PAGE_SIZE),
    enabled: !!id,
  });
  const timelineQuery = useQuery({
    queryKey: ["customer-timeline", id],
    queryFn: () => customerApi.getTimeline(id!),
    enabled: !!id,
  });
  const recentActivityQuery = useQuery({
    queryKey: ["customer-recent-activity", id],
    queryFn: () => customerApi.getRecentActivity(id!, 10),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CustomerPayload) => customerApi.updateCustomer(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      notify("Customer updated");
      setFormOpen(false);
    },
    onError: (error) => notify(getApiErrorMessage(error, "Could not update customer. Please try again."), "error"),
  });

  if (customerQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return <ErrorState title="Could not load this customer" onRetry={() => customerQuery.refetch()} />;
  }

  const customer = customerQuery.data;
  const summary = customer.summary;
  const history = historyQuery.data;
  const timeline = timelineQuery.data ?? [];
  const recentActivity = recentActivityQuery.data ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/customers")}
        className="icon-action-btn mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-content-muted hover:bg-surface-elevated hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </button>

      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{customer.full_name}</h1>
            <Badge tone={SEGMENT_TONE[summary.segment]}>{SEGMENT_LABEL[summary.segment]}</Badge>
            {customer.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
          </div>
          <p className="text-sm text-content-muted">
            {customer.customer_code} &middot; {customer.customer_type} Customer &middot; Customer since {formatDate(customer.created_at)}
          </p>
        </div>
        {canManage && (
          <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
            Edit Customer
          </Button>
        )}
      </div>

      <div className="mb-5 flex gap-1 rounded-lg border border-border/25 bg-surface p-1 text-sm font-semibold w-fit">
        {[
          { key: "profile", label: "Profile", icon: ClipboardList },
          { key: "purchases", label: "Purchase History", icon: ReceiptText },
          { key: "timeline", label: "Timeline", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 transition-colors ${
                activeTab === tab.key ? "bg-brand-teal text-[#042F2E]" : "text-content-muted hover:text-content"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Personal Information</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <DetailItem label="Customer ID" value={customer.customer_code} />
                <DetailItem label="Full Name" value={customer.full_name} />
                <DetailItem label="Email" value={customer.email} />
                <DetailItem label="Phone Number" value={customer.phone} />
                <DetailItem label="Date of Birth" value={formatDate(customer.date_of_birth)} />
                <DetailItem label="Gender" value={customer.gender} />
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Address Information</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <DetailItem label="Address" value={customer.address} />
                <DetailItem label="City" value={customer.city} />
                <DetailItem label="State" value={customer.state} />
                <DetailItem label="Country" value={customer.country} />
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Business Information</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <DetailItem label="Customer Type" value={customer.customer_type} />
                <DetailItem label="Preferred Sales Channel" value={customer.preferred_channel} />
                <DetailItem label="Status" value={customer.is_active ? "Active" : "Inactive"} />
                <DetailItem label="Customer Since" value={formatDate(customer.created_at)} />
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <p className="mb-4 text-sm font-semibold text-content-muted">Business Statistics</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <DetailItem label="Lifetime Revenue" value={formatCurrency(summary.total_revenue)} />
              <DetailItem label="Total Orders" value={summary.total_orders} />
              <DetailItem label="Total Quantity Purchased" value={summary.total_quantity} />
              <DetailItem label="Average Order Value" value={formatCurrency(summary.average_order_value)} />
              <DetailItem label="Purchase Frequency" value={purchaseFrequencyLabel(summary.total_orders, customer.created_at)} />
              <DetailItem label="Last Purchase Date" value={formatDate(summary.last_purchase_date)} />
              <DetailItem label="First Purchase Date" value={formatDate(summary.first_purchase_date)} />
              <DetailItem label="Favorite Product" value={summary.favorite_product_name} />
              <DetailItem label="Favorite Category" value={summary.favorite_category_name} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <p className="mb-4 text-sm font-semibold text-content-muted">Recent Activity</p>
              {recentActivityQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size={22} />
                </div>
              ) : recentActivity.length === 0 ? (
                <EmptyState title="No recent activity" />
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((activity, index) => {
                    const Icon = RECENT_ACTIVITY_ICON[activity.type] ?? ClipboardList;
                    return (
                      <Card key={index} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-brand-teal">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold">{activity.type}</p>
                            <p className="text-xs text-content-muted">
                              {activity.details}
                              {activity.performed_by ? ` · By ${activity.performed_by}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {activity.purchase_value != null && (
                            <p className="text-sm font-semibold">{formatCurrency(activity.purchase_value)}</p>
                          )}
                          <p className="text-xs text-content-muted">{formatDateTime(activity.occurred_at)}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Current Customer Segment</p>
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-brand-teal" />
                <Badge tone={SEGMENT_TONE[summary.segment]}>{SEGMENT_LABEL[summary.segment]}</Badge>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "purchases" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-4"><DetailItem label="Lifetime Revenue" value={formatCurrency(summary.total_revenue)} /></Card>
            <Card className="p-4"><DetailItem label="Total Orders" value={summary.total_orders} /></Card>
            <Card className="p-4"><DetailItem label="Total Quantity" value={summary.total_quantity} /></Card>
            <Card className="p-4"><DetailItem label="Average Order Value" value={formatCurrency(summary.average_order_value)} /></Card>
            <Card className="p-4"><DetailItem label="First Purchase" value={formatDate(summary.first_purchase_date)} /></Card>
            <Card className="p-4"><DetailItem label="Last Purchase" value={formatDate(summary.last_purchase_date)} /></Card>
            <Card className="p-4"><DetailItem label="Favorite Product" value={summary.favorite_product_name} /></Card>
            <Card className="p-4"><DetailItem label="Favorite Category" value={summary.favorite_category_name} /></Card>
          </div>

          {historyQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size={24} />
            </div>
          ) : !history || history.sales.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="h-8 w-8" />} title="No purchases yet" />
          ) : (
            <>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Invoice Number</TableHeaderCell>
                    <TableHeaderCell>Order Date</TableHeaderCell>
                    <TableHeaderCell>Products Purchased</TableHeaderCell>
                    <TableHeaderCell>Quantity Purchased</TableHeaderCell>
                    <TableHeaderCell>Total Amount</TableHeaderCell>
                    <TableHeaderCell>Payment Method</TableHeaderCell>
                    <TableHeaderCell>Order Status</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {history.sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs text-content-muted">{sale.invoice_number}</TableCell>
                      <TableCell>{formatDate(sale.sale_date)}</TableCell>
                      <TableCell className="text-content-muted">{productsSummary(sale)}</TableCell>
                      <TableCell>{totalQuantity(sale)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell className="text-content-muted">{PAYMENT_METHOD_LABEL[sale.payment_method] ?? sale.payment_method}</TableCell>
                      <TableCell>
                        <Badge tone={sale.status === "COMPLETED" ? "success" : sale.status === "REFUNDED" ? "warning" : "neutral"}>{sale.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={historyPage} pageSize={history.pageSize} total={history.total} onPageChange={setHistoryPage} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <p className="mb-2 text-sm font-semibold text-content-muted">Frequently Purchased Products</p>
                  {history.frequentlyPurchasedProducts.length === 0 ? (
                    <p className="text-sm text-content-muted">No frequent products yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {history.frequentlyPurchasedProducts.map((product) => (
                        <span key={product.product_id} className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium">
                          {product.product_name} x {product.total_quantity}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <p className="mb-2 text-sm font-semibold text-content-muted">Recent Transactions</p>
                  <div className="space-y-2">
                    {history.sales.slice(0, 5).map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-mono text-xs text-content-muted">{sale.invoice_number}</span>
                        <span className="font-semibold">{formatCurrency(sale.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <Card className="p-5">
          <h2 className="mb-4 text-base font-bold">Customer Timeline</h2>
          {timelineQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size={24} />
            </div>
          ) : timeline.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <div className="space-y-4">
              {timeline.map((entry, index) => {
                const Icon = TIMELINE_ICON[entry.type] ?? Clock;
                return (
                  <div key={index} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{TIMELINE_LABEL[entry.type] ?? entry.type}</p>
                      {entry.details && <p className="text-xs text-content-muted">{entry.details}</p>}
                      <p className="text-xs text-content-muted">
                        {formatDateTime(entry.occurred_at)}
                        {" "}
                        &middot; {entry.performed_by ? `by ${entry.performed_by}` : "System"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={customer}
        isSubmitting={updateMutation.isPending}
        onSubmit={(values) => updateMutation.mutate(toPayload(values))}
      />
    </div>
  );
}
