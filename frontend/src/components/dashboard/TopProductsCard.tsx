import { Card } from "../common/Card";
import { formatCurrency } from "../../services/formatters";
import type { TopProduct } from "../../types";

export function TopProductsCard({ products }: { products: TopProduct[] }) {
  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-content-muted">Top Products</p>
      {products.length === 0 ? (
        <p className="py-8 text-center text-sm text-content-muted">No sales yet</p>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => (
            <div key={product.product_id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-amber/15 text-xs font-bold text-brand-amber">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{product.product_name}</p>
                  <p className="text-xs text-content-muted">{product.units_sold} units sold</p>
                </div>
              </div>
              <p className="text-sm font-bold text-brand-teal">{formatCurrency(product.revenue)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
