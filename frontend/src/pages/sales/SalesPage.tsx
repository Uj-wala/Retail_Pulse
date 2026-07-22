import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Banknote, CreditCard, Eye, Pencil, Plus, ReceiptText, Search, ShoppingCart, Trash2, Undo2 } from "lucide-react";
import { saleApi, type SaleFilters, type SalePayload } from "../../api/saleApi";
import { productApi } from "../../api/productApi";
import { categoryApi } from "../../api/categoryApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { Card } from "../../components/common/Card";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Drawer } from "../../components/common/Drawer";
import { Pagination } from "../../components/common/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatCurrency, formatDateTime } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { SaleFormModal } from "./SaleFormModal";
import type { PaymentMethod, Sale, SalesChannel } from "../../types";
import type { SaleFormValues } from "./saleSchema";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN", "ANALYST"];
const PAGE_SIZE = 5;

const channelLabels: Record<SalesChannel, string> = {
  RETAIL_STORE: "Retail Store",
  ONLINE_STORE: "Online Store",
  MARKETPLACE: "Marketplace",
};

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMessage = (data.detail[0] as { msg?: unknown })?.msg;
    if (typeof firstMessage === "string") return firstMessage;
  }
  return fallback;
}

function toPayload(values: SaleFormValues): SalePayload {
  return {
    customerName: values.customerName || undefined,
    saleDate: values.saleDate ? new Date(values.saleDate).toISOString() : undefined,
    salesChannel: values.salesChannel,
    paymentMethod: values.paymentMethod,
    items: values.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
    })),
  };
}

function SaleDetailsDrawer({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  return (
    <Drawer open={!!sale} onClose={onClose} title={sale?.invoice_number ?? "Sale Details"}>
      {sale && (
        <div className="space-y-5 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-content-muted">Invoice Details</h3>
            <div className="space-y-2 rounded-lg bg-surface-elevated p-3">
              <div className="flex justify-between gap-3"><span>Invoice</span><strong>{sale.invoice_number}</strong></div>
              <div className="flex justify-between gap-3"><span>Date</span><strong>{formatDateTime(sale.sale_date)}</strong></div>
              <div className="flex justify-between gap-3"><span>Channel</span><strong>{channelLabels[sale.sales_channel]}</strong></div>
              <div className="flex justify-between gap-3"><span>Payment</span><strong>{paymentLabels[sale.payment_method]}</strong></div>
              <div className="flex justify-between gap-3"><span>Created By</span><strong>{sale.cashier_name ?? "Unknown"}</strong></div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-content-muted">Customer Information</h3>
            <p className="rounded-lg bg-surface-elevated p-3 font-semibold">{sale.customer_name || "Walk-in Customer"}</p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-content-muted">Product Details</h3>
            <div className="space-y-3">
              {sale.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/15 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-xs text-content-muted">{item.category_name ?? "Uncategorized"}</p>
                    </div>
                    <strong>{formatCurrency(item.total)}</strong>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-content-muted">
                    <span>Qty: {item.quantity}</span>
                    <span>Unit: {formatCurrency(item.unit_price)}</span>
                    <span>Discount: {formatCurrency(item.discount)}</span>
                    <span>Tax: {formatCurrency(item.tax)}</span>
                    <span>Subtotal: {formatCurrency(item.subtotal)}</span>
                    <span>Stock Left: {item.remaining_stock ?? "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-content-muted">Pricing Breakdown</h3>
            <div className="space-y-2 rounded-lg bg-surface-elevated p-3">
              <div className="flex justify-between"><span>Product Value</span><strong>{formatCurrency(sale.items.reduce((sum, item) => sum + item.subtotal, 0))}</strong></div>
              <div className="flex justify-between"><span>Discount Applied</span><strong>{formatCurrency(sale.items.reduce((sum, item) => sum + item.discount, 0))}</strong></div>
              <div className="flex justify-between"><span>Taxes</span><strong>{formatCurrency(sale.items.reduce((sum, item) => sum + item.tax, 0))}</strong></div>
              <div className="border-t border-border/15 pt-2 flex justify-between text-base"><span>Final Amount</span><strong>{formatCurrency(sale.total_amount)}</strong></div>
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}

export function SalesPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [salesChannel, setSalesChannel] = useState<SalesChannel | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [saleDate, setSaleDate] = useState("");
  const [sort, setSort] = useState<SaleFilters["sort"]>("-date");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [deleting, setDeleting] = useState<Sale | null>(null);
  const [refunding, setRefunding] = useState<Sale | null>(null);

  const filters: SaleFilters = {
    search: search || undefined,
    categoryId: categoryId || undefined,
    salesChannel: salesChannel || undefined,
    paymentMethod: paymentMethod || undefined,
    startDate: saleDate ? new Date(`${saleDate}T00:00:00`).toISOString() : undefined,
    endDate: saleDate ? new Date(`${saleDate}T23:59:59.999`).toISOString() : undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const salesQuery = useQuery({ queryKey: ["sales", filters], queryFn: () => saleApi.listSales(filters) });
  const summaryQuery = useQuery({ queryKey: ["sales", "summary"], queryFn: saleApi.getSummary });
  const productsQuery = useQuery({
    queryKey: ["products", { isActive: true, pageSize: 200 }],
    queryFn: () => productApi.listProducts({ isActive: true, pageSize: 200 }),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", { pageSize: 200 }],
    queryFn: () => categoryApi.listCategories({ pageSize: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: saleApi.createSale,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      notify(`Sale ${data.sale.invoice_number} completed`);
      setFormOpen(false);
    },
    onError: (error) => notify(getApiErrorMessage(error, "Could not complete sale. Check stock availability."), "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SalePayload }) => saleApi.updateSale(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      notify("Sale updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (error) => notify(getApiErrorMessage(error, "Could not update sale."), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => saleApi.deleteSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      notify("Sale deleted");
      setDeleting(null);
    },
    onError: (error) => notify(getApiErrorMessage(error, "Could not delete sale."), "error"),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => saleApi.refundSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify("Sale refunded");
      setRefunding(null);
    },
  });

  const sales = salesQuery.data?.sales ?? [];
  const products = productsQuery.data?.products ?? [];
  const categories = categoriesQuery.data?.categories ?? [];
  const summary = summaryQuery.data;

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold">Sales</h1>
          <p className="text-sm text-content-muted">Record transactions, protect stock, and inspect invoice-level revenue.</p>
        </div>
        {canManage && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            New Sale
          </Button>
        )}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-content-muted">Total Sales</p><p className="text-xl font-extrabold">{formatCurrency(summary?.totalSales ?? 0)}</p></div><Banknote className="h-5 w-5 text-brand-teal" /></div></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-content-muted">Total Revenue</p><p className="text-xl font-extrabold">{formatCurrency(summary?.totalRevenue ?? 0)}</p></div><CreditCard className="h-5 w-5 text-brand-teal" /></div></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-content-muted">Total Orders</p><p className="text-xl font-extrabold">{summary?.totalOrders ?? 0}</p></div><ShoppingCart className="h-5 w-5 text-brand-teal" /></div></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-content-muted">Average Order Value</p><p className="text-xl font-extrabold">{formatCurrency(summary?.averageOrderValue ?? 0)}</p></div><ReceiptText className="h-5 w-5 text-brand-teal" /></div></Card>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(130px,auto))]">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search invoice, customer, or product"
            className="w-full rounded-lg border border-border/25 bg-surface py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
          />
        </div>
        <input
          value={saleDate}
          onChange={(event) => { setSaleDate(event.target.value); setPage(1); }}
          type="date"
          aria-label="Filter by sale date"
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        />
        <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20">
          <option value="">All Categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select value={salesChannel} onChange={(event) => { setSalesChannel(event.target.value as SalesChannel | ""); setPage(1); }} className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20">
          <option value="">All Channels</option>
          <option value="RETAIL_STORE">Retail Store</option>
          <option value="ONLINE_STORE">Online Store</option>
          <option value="MARKETPLACE">Marketplace</option>
        </select>
        <select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value as PaymentMethod | ""); setPage(1); }} className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20">
          <option value="">All Payments</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
        <select value={sort} onChange={(event) => { setSort(event.target.value as SaleFilters["sort"]); setPage(1); }} className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20">
          <option value="-date">Newest</option>
          <option value="date">Oldest</option>
          <option value="invoiceNumber">Invoice A-Z</option>
          <option value="-invoiceNumber">Invoice Z-A</option>
          <option value="-totalAmount">Amount High-Low</option>
          <option value="totalAmount">Amount Low-High</option>
        </select>
      </div>

      {salesQuery.isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : sales.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="h-10 w-10" />} title="No sales found" description="Record a transaction or adjust your filters." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Invoice</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Channel</TableHeaderCell>
              <TableHeaderCell>Payment</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-mono text-xs font-semibold">{sale.invoice_number}</TableCell>
                <TableCell>{sale.customer_name || "Walk-in"}</TableCell>
                <TableCell className="text-content-muted">{sale.items[0]?.product_name ?? "-"}{sale.items.length > 1 ? ` +${sale.items.length - 1}` : ""}</TableCell>
                <TableCell>{channelLabels[sale.sales_channel]}</TableCell>
                <TableCell>{paymentLabels[sale.payment_method]}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                <TableCell><Badge tone={sale.status === "COMPLETED" ? "success" : sale.status === "REFUNDED" ? "warning" : "neutral"}>{sale.status}</Badge></TableCell>
                <TableCell className="text-content-muted">{formatDateTime(sale.sale_date)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => setViewing(sale)} className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content" title="View details"><Eye className="h-4 w-4" /></button>
                    {canManage && sale.status === "COMPLETED" && (
                      <>
                        <button type="button" onClick={() => { setEditing(sale); setFormOpen(true); }} className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content" title="Edit sale"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setRefunding(sale)} className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-amber-500/10 hover:text-amber-500" title="Refund sale"><Undo2 className="h-4 w-4" /></button>
                      </>
                    )}
                    {canManage && <button type="button" onClick={() => setDeleting(sale)} className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-red-500/10 hover:text-red-500" title="Delete sale"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {salesQuery.data && <Pagination page={page} pageSize={salesQuery.data.pageSize} total={salesQuery.data.total} onPageChange={setPage} />}

      <SaleFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        products={products}
        initial={editing}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const payload = toPayload(values);
          if (editing) updateMutation.mutate({ id: editing.id, payload });
          else createMutation.mutate(payload);
        }}
      />

      <SaleDetailsDrawer sale={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Sale"
        message={`Delete ${deleting?.invoice_number}? Inventory from this sale will be restored.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />

      <ConfirmDialog
        open={!!refunding}
        title="Refund Sale"
        message={`Refund ${refunding?.invoice_number}? All items will be restocked and the sale will be marked refunded.`}
        confirmLabel="Refund"
        isLoading={refundMutation.isPending}
        onCancel={() => setRefunding(null)}
        onConfirm={() => refunding && refundMutation.mutate(refunding.id)}
      />
    </div>
  );
}
