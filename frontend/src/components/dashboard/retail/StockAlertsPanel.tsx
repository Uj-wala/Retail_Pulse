import { useState } from "react";
import { Card } from "../../common/Card";
import { Skeleton } from "../../common/Skeleton";
import { Badge } from "../../common/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../tables/Table";
import type { DashboardProductRow } from "../../../types";

interface StockAlertsPanelProps {
  topLowStock: DashboardProductRow[] | undefined;
  outOfStock: DashboardProductRow[] | undefined;
  isLoading: boolean;
}

type Tab = "low-stock" | "out-of-stock";

export function StockAlertsPanel({ topLowStock, outOfStock, isLoading }: StockAlertsPanelProps) {
  const [tab, setTab] = useState<Tab>("low-stock");
  const rows = tab === "low-stock" ? topLowStock : outOfStock;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm font-semibold text-content-muted">Stock Alerts</p>
        <div className="flex gap-1 rounded-lg bg-surface-elevated p-1">
          <button
            type="button"
            onClick={() => setTab("low-stock")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${tab === "low-stock" ? "bg-brand-teal text-[#042F2E]" : "text-content-muted"}`}
          >
            Top Low Stock
          </button>
          <button
            type="button"
            onClick={() => setTab("out-of-stock")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${tab === "out-of-stock" ? "bg-brand-teal text-[#042F2E]" : "text-content-muted"}`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-content-muted">
          {tab === "low-stock" ? "No products are running low on stock." : "No products are out of stock."}
        </p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>SKU</TableHeaderCell>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Stock</TableHeaderCell>
              <TableHeaderCell>Reorder Level</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {rows.map((product) => (
              <TableRow key={product.productId}>
                <TableCell className="font-mono text-xs text-content-muted">{product.sku}</TableCell>
                <TableCell className="font-semibold">{product.name}</TableCell>
                <TableCell className="text-content-muted">{product.categoryName ?? "Uncategorized"}</TableCell>
                <TableCell>{product.stockQuantity}</TableCell>
                <TableCell>{product.reorderLevel}</TableCell>
                <TableCell>
                  {product.stockQuantity <= 0 ? (
                    <Badge tone="danger">Out of Stock</Badge>
                  ) : (
                    <Badge tone="warning">Low Stock</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
