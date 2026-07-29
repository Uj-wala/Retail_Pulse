import { useQuery } from "@tanstack/react-query";
import { Modal } from "../../common/Modal";
import { Spinner } from "../../common/Spinner";
import { ErrorState } from "../../common/ErrorState";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../tables/Table";
import { dashboardAnalyticsApi } from "../../../api/dashboardAnalyticsApi";
import { formatCurrency, formatDateTime } from "../../../services/formatters";
import { channelLabels, paymentLabels } from "../../../services/dashboardLabels";
import type {
  DashboardFilterValues,
  DashboardKpiKey,
  DashboardProductRow,
  DashboardSaleRow,
} from "../../../types";

export type DrilldownRequest =
  | { kind: "kpi"; kpi: DashboardKpiKey; label: string }
  | { kind: "category"; categoryId: string; label: string }
  | { kind: "product"; productId: string; label: string };

interface DrilldownModalProps {
  request: DrilldownRequest | null;
  filters: DashboardFilterValues;
  onClose: () => void;
}

function isSaleRow(row: unknown): row is DashboardSaleRow {
  return typeof row === "object" && row !== null && "saleId" in row;
}

function isProductRow(row: unknown): row is DashboardProductRow {
  return typeof row === "object" && row !== null && "sku" in row;
}

export function DrilldownModal({ request, filters, onClose }: DrilldownModalProps) {
  const kpiQuery = useQuery({
    queryKey: ["analytics", "dashboard", "drilldown", "kpi", request?.kind === "kpi" ? request.kpi : null, filters],
    queryFn: () => dashboardAnalyticsApi.getKpiDrilldown((request as { kind: "kpi"; kpi: DashboardKpiKey }).kpi, filters),
    enabled: request?.kind === "kpi",
  });

  const categoryQuery = useQuery({
    queryKey: ["analytics", "dashboard", "drilldown", "category", request?.kind === "category" ? request.categoryId : null, filters],
    queryFn: () => dashboardAnalyticsApi.getCategoryDrilldown((request as { kind: "category"; categoryId: string }).categoryId, filters),
    enabled: request?.kind === "category",
  });

  const productQuery = useQuery({
    queryKey: ["analytics", "dashboard", "drilldown", "product", request?.kind === "product" ? request.productId : null, filters],
    queryFn: () => dashboardAnalyticsApi.getProductDrilldown((request as { kind: "product"; productId: string }).productId, filters),
    enabled: request?.kind === "product",
  });

  const isLoading = kpiQuery.isLoading || categoryQuery.isLoading || productQuery.isLoading;
  const isError = kpiQuery.isError || categoryQuery.isError || productQuery.isError;

  return (
    <Modal open={Boolean(request)} onClose={onClose} title={request?.label ?? "Details"} maxWidthClassName="max-w-3xl">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : isError ? (
        <ErrorState title="Couldn't load details" description="Please try again." onRetry={() => { kpiQuery.refetch(); categoryQuery.refetch(); productQuery.refetch(); }} />
      ) : request?.kind === "kpi" && kpiQuery.data ? (
        kpiQuery.data.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-content-muted">No matching records for the active filters.</p>
        ) : isSaleRow(kpiQuery.data.rows[0]) ? (
          <SalesTable rows={kpiQuery.data.rows as DashboardSaleRow[]} />
        ) : isProductRow(kpiQuery.data.rows[0]) ? (
          <ProductsTable rows={kpiQuery.data.rows as DashboardProductRow[]} />
        ) : (
          <CategoriesTable rows={kpiQuery.data.rows as { categoryId: string; categoryName: string; productCount: number }[]} />
        )
      ) : request?.kind === "category" && categoryQuery.data ? (
        categoryQuery.data.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-content-muted">No products in this category.</p>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>Stock</TableHeaderCell>
                <TableHeaderCell>Units Sold</TableHeaderCell>
                <TableHeaderCell>Revenue</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {categoryQuery.data.rows.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell className="font-mono text-xs text-content-muted">{row.sku}</TableCell>
                  <TableCell className="font-semibold">{row.name}</TableCell>
                  <TableCell>{row.stockQuantity}</TableCell>
                  <TableCell>{row.unitsSold}</TableCell>
                  <TableCell className="font-semibold text-brand-teal">{formatCurrency(row.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : request?.kind === "product" && productQuery.data ? (
        productQuery.data.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-content-muted">No sales transactions for this product yet.</p>
        ) : (
          <SalesTable rows={productQuery.data.rows} />
        )
      ) : null}
    </Modal>
  );
}

function SalesTable({ rows }: { rows: DashboardSaleRow[] }) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Invoice</TableHeaderCell>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell>Channel</TableHeaderCell>
          <TableHeaderCell>Payment</TableHeaderCell>
          <TableHeaderCell>Qty</TableHeaderCell>
          <TableHeaderCell>Amount</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row.saleId}-${index}`}>
            <TableCell className="font-mono text-xs text-content-muted">{row.invoiceNumber}</TableCell>
            <TableCell className="text-content-muted">{formatDateTime(row.date)}</TableCell>
            <TableCell>{row.customerName}</TableCell>
            <TableCell>{channelLabels[row.salesChannel]}</TableCell>
            <TableCell>{paymentLabels[row.paymentMethod]}</TableCell>
            <TableCell>{row.quantity}</TableCell>
            <TableCell className="font-semibold text-brand-teal">{formatCurrency(row.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ProductsTable({ rows }: { rows: DashboardProductRow[] }) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>SKU</TableHeaderCell>
          <TableHeaderCell>Product</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Stock</TableHeaderCell>
          <TableHeaderCell>Reorder Level</TableHeaderCell>
          <TableHeaderCell>Unit Price</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.productId}>
            <TableCell className="font-mono text-xs text-content-muted">{row.sku}</TableCell>
            <TableCell className="font-semibold">{row.name}</TableCell>
            <TableCell className="text-content-muted">{row.categoryName ?? "Uncategorized"}</TableCell>
            <TableCell>{row.stockQuantity}</TableCell>
            <TableCell>{row.reorderLevel}</TableCell>
            <TableCell>{formatCurrency(row.unitPrice)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CategoriesTable({ rows }: { rows: { categoryId: string; categoryName: string; productCount: number }[] }) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Products</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.categoryId}>
            <TableCell className="font-semibold">{row.categoryName}</TableCell>
            <TableCell>{row.productCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
