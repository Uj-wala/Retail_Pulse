import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { reportApi } from "../../api/reportApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatCurrency, formatDateTime } from "../../services/formatters";
import { exportToCsv } from "../../services/csvExport";

type ReportTab = "sales" | "inventory";

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("sales");

  const salesReportQuery = useQuery({
    queryKey: ["reports", "sales"],
    queryFn: () => reportApi.getSalesReport(),
    enabled: tab === "sales",
  });
  const inventoryReportQuery = useQuery({
    queryKey: ["reports", "inventory"],
    queryFn: reportApi.getInventoryReport,
    enabled: tab === "inventory",
  });

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-sm text-content-muted">Sales and inventory reports, exportable as CSV.</p>
        </div>
        <div className="flex gap-2 rounded-lg bg-surface-elevated p-1">
          <button
            type="button"
            onClick={() => setTab("sales")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${tab === "sales" ? "bg-brand-teal text-[#042F2E]" : "text-content-muted"}`}
          >
            Sales
          </button>
          <button
            type="button"
            onClick={() => setTab("inventory")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${tab === "inventory" ? "bg-brand-teal text-[#042F2E]" : "text-content-muted"}`}
          >
            Inventory
          </button>
        </div>
      </div>

      {tab === "sales" ? (
        salesReportQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size={28} />
          </div>
        ) : (
          <div>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-sm text-content-muted">Total Revenue</p>
                <p className="mt-1 text-xl font-extrabold">{formatCurrency(salesReportQuery.data?.total_revenue ?? 0)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-content-muted">Total Orders</p>
                <p className="mt-1 text-xl font-extrabold">{salesReportQuery.data?.total_orders ?? 0}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-content-muted">Units Sold</p>
                <p className="mt-1 text-xl font-extrabold">{salesReportQuery.data?.total_units_sold ?? 0}</p>
              </Card>
            </div>

            <div className="mb-3 flex justify-end">
              <Button
                variant="outline"
                icon={<Download className="h-4 w-4" />}
                onClick={() =>
                  exportToCsv(
                    "sales-report.csv",
                    (salesReportQuery.data?.sales ?? []).map((sale) => ({
                      id: sale.id,
                      cashier: sale.cashier_name,
                      customer: sale.customer_name ?? "Walk-in",
                      total: sale.total_amount,
                      items: sale.item_count,
                      date: sale.created_at,
                    })),
                  )
                }
              >
                Export CSV
              </Button>
            </div>

            {(salesReportQuery.data?.sales.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-content-muted">No sales in this period.</p>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Cashier</TableHeaderCell>
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Items</TableHeaderCell>
                    <TableHeaderCell>Total</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {salesReportQuery.data?.sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-semibold">{sale.cashier_name}</TableCell>
                      <TableCell className="text-content-muted">{sale.customer_name ?? "Walk-in"}</TableCell>
                      <TableCell>{sale.item_count}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell className="text-content-muted">{formatDateTime(sale.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )
      ) : inventoryReportQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : (
        <div>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm text-content-muted">Total Products</p>
              <p className="mt-1 text-xl font-extrabold">{inventoryReportQuery.data?.total_products ?? 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-content-muted">Total Stock Units</p>
              <p className="mt-1 text-xl font-extrabold">{inventoryReportQuery.data?.total_stock_units ?? 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-content-muted">Inventory Value</p>
              <p className="mt-1 text-xl font-extrabold">{formatCurrency(inventoryReportQuery.data?.inventory_value ?? 0)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-content-muted">Low Stock Items</p>
              <p className="mt-1 text-xl font-extrabold text-amber-500">{inventoryReportQuery.data?.low_stock_count ?? 0}</p>
            </Card>
          </div>

          <div className="mb-3 flex justify-end">
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() =>
                exportToCsv(
                  "inventory-report.csv",
                  (inventoryReportQuery.data?.products ?? []).map((product) => ({
                    sku: product.sku,
                    name: product.name,
                    category: product.category_name ?? "Uncategorized",
                    stock: product.stock_quantity,
                    reorder_level: product.reorder_level,
                  })),
                )
              }
            >
              Export CSV
            </Button>
          </div>

          {(inventoryReportQuery.data?.products.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-content-muted">
              <FileText className="mx-auto mb-2 h-8 w-8" />
              No products yet.
            </p>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>SKU</TableHeaderCell>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Stock</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {inventoryReportQuery.data?.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs text-content-muted">{product.sku}</TableCell>
                    <TableCell className="font-semibold">{product.name}</TableCell>
                    <TableCell className="text-content-muted">{product.category_name ?? "Uncategorized"}</TableCell>
                    <TableCell>{product.stock_quantity}</TableCell>
                    <TableCell>
                      {product.low_stock ? <Badge tone="warning">Low Stock</Badge> : <Badge tone="success">OK</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
