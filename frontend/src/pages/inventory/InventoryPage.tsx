import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Boxes, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { inventoryApi } from "../../api/inventoryApi";
import { productApi } from "../../api/productApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatDateTime } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { InventoryFormModal } from "./InventoryFormModal";
import type { InventoryTransactionFormValues } from "./inventorySchema";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN", "ANALYST"];

const TYPE_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
  RESTOCK: "success",
  RETURN: "success",
  SALE: "neutral",
  ADJUSTMENT: "warning",
};

export function InventoryPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [formOpen, setFormOpen] = useState(false);

  const transactionsQuery = useQuery({
    queryKey: ["inventory-transactions"],
    queryFn: () => inventoryApi.listTransactions(),
  });
  const productsQuery = useQuery({ queryKey: ["products", ""], queryFn: () => productApi.listProducts() });

  const createMutation = useMutation({
    mutationFn: inventoryApi.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify("Inventory movement recorded");
      setFormOpen(false);
    },
    onError: () => {
      notify("Could not record movement. Check the quantity and try again.", "error");
    },
  });

  const transactions = transactionsQuery.data?.transactions ?? [];
  const products = productsQuery.data?.products ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Inventory</h1>
          <p className="text-sm text-content-muted">Track stock movements across your catalog.</p>
        </div>
        {canManage && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
            Record Movement
          </Button>
        )}
      </div>

      {transactionsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState icon={<Boxes className="h-10 w-10" />} title="No inventory movements yet" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Quantity</TableHeaderCell>
              <TableHeaderCell>Note</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => {
              const isInbound = transaction.type === "RESTOCK" || transaction.type === "RETURN";
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-semibold">{transaction.product_name}</TableCell>
                  <TableCell>
                    <Badge tone={TYPE_TONE[transaction.type]}>{transaction.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 font-semibold ${isInbound ? "text-emerald-500" : "text-red-500"}`}>
                      {isInbound ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {transaction.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-content-muted">{transaction.note || "—"}</TableCell>
                  <TableCell className="text-content-muted">{formatDateTime(transaction.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <InventoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        products={products}
        isSubmitting={createMutation.isPending}
        onSubmit={(values: InventoryTransactionFormValues) => createMutation.mutate(values)}
      />
    </div>
  );
}
