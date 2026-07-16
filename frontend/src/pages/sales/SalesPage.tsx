import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingCart, ChevronDown, ChevronUp, Undo2 } from "lucide-react";
import { saleApi } from "../../api/saleApi";
import { productApi } from "../../api/productApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatCurrency, formatDateTime } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { SaleFormModal } from "./SaleFormModal";
import type { Sale } from "../../types";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN", "ANALYST"];

export function SalesPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [formOpen, setFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<Sale | null>(null);

  const salesQuery = useQuery({ queryKey: ["sales"], queryFn: saleApi.listSales });
  const productsQuery = useQuery({ queryKey: ["products", ""], queryFn: () => productApi.listProducts() });

  const createMutation = useMutation({
    mutationFn: saleApi.createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify("Sale completed");
      setFormOpen(false);
    },
    onError: () => {
      notify("Could not complete sale. Check stock availability.", "error");
    },
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Sales</h1>
          <p className="text-sm text-content-muted">Record and review point-of-sale transactions.</p>
        </div>
        {canManage && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
            New Sale
          </Button>
        )}
      </div>

      {salesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : sales.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="h-10 w-10" />} title="No sales recorded yet" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell />
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Cashier</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              {canManage && <TableHeaderCell className="text-right">Actions</TableHeaderCell>}
            </tr>
          </TableHead>
          <TableBody>
            {sales.map((sale) => (
              <Fragment key={sale.id}>
                <TableRow>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                      className="text-content-muted hover:text-content"
                    >
                      {expandedId === sale.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-semibold">{sale.customer_name || "Walk-in"}</TableCell>
                  <TableCell className="text-content-muted">{sale.cashier_name}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                  <TableCell>
                    <Badge tone={sale.status === "COMPLETED" ? "success" : sale.status === "REFUNDED" ? "warning" : "neutral"}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-content-muted">{formatDateTime(sale.created_at)}</TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex justify-end">
                        {sale.status === "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => setRefunding(sale)}
                            title="Refund sale"
                            className="rounded-lg p-2 text-content-muted hover:bg-amber-500/10 hover:text-amber-500"
                          >
                            <Undo2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
                {expandedId === sale.id && (
                  <TableRow>
                    <TableCell />
                    <TableCell colSpan={canManage ? 6 : 5}>
                      <div className="space-y-1 py-1">
                        {sale.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs text-content-muted">
                            <span>
                              {item.quantity} x {item.product_name}
                            </span>
                            <span>{formatCurrency(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}

      <SaleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        products={products}
        isSubmitting={createMutation.isPending}
        onSubmit={(values) =>
          createMutation.mutate({
            customerName: values.customerName || undefined,
            items: values.items,
          })
        }
      />

      <ConfirmDialog
        open={!!refunding}
        title="Refund Sale"
        message="This will restock all items from this sale and mark it as refunded."
        confirmLabel="Refund"
        isLoading={refundMutation.isPending}
        onCancel={() => setRefunding(null)}
        onConfirm={() => refunding && refundMutation.mutate(refunding.id)}
      />
    </div>
  );
}
