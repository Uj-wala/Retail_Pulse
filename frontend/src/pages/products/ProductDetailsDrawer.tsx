import type { ReactNode } from "react";
import { Drawer } from "../../components/common/Drawer";
import { Badge } from "../../components/common/Badge";
import { formatCurrency, formatDateTime } from "../../services/formatters";
import type { Product } from "../../types";

interface ProductDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-border/10 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-content">{value}</p>
    </div>
  );
}

function buildProductSummary(product: Product): string {
  const category = product.category_name ?? "catalog";
  const brand = product.brand ? ` from ${product.brand}` : "";
  return `${product.name} is a ${category} product${brand}. It is priced at ${formatCurrency(product.unit_price)} with ${product.stock_quantity} ${product.unit_of_measure} currently in stock.`;
}

export function ProductDetailsDrawer({ open, onClose, product }: ProductDetailsDrawerProps) {
  if (!product) return null;

  const margin = product.unit_price > 0 ? ((product.unit_price - product.cost_price) / product.unit_price) * 100 : 0;

  return (
    <Drawer open={open} onClose={onClose} title="Product Details">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{product.name}</h3>
          <p className="font-mono text-xs text-content-muted">{product.sku}</p>
        </div>
        {product.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
      </div>

      <Field label="Category" value={product.category_name ?? "Uncategorized"} />
      <Field label="Brand" value={product.brand ?? "-"} />
      <Field
        label="Unit Price / Cost Price"
        value={`${formatCurrency(product.unit_price)} / ${formatCurrency(product.cost_price)} (${margin.toFixed(1)}% margin)`}
      />
      <Field
        label="Stock Quantity"
        value={
          <span className={product.low_stock ? "font-bold text-amber-500" : ""}>
            {product.stock_quantity} {product.unit_of_measure}
            {product.low_stock && " - Low Stock"}
          </span>
        }
      />
      <Field label="Reorder Level" value={`${product.reorder_level} ${product.unit_of_measure}`} />
      <Field label="Unit of Measure" value={product.unit_of_measure} />
      <Field label="Description" value={product.description || buildProductSummary(product)} />
      <Field label="Created" value={formatDateTime(product.created_at)} />
      <Field label="Last Updated" value={formatDateTime(product.updated_at)} />
    </Drawer>
  );
}
