import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../../common/Card";
import { ChartCardSkeleton } from "../../common/ChartCardSkeleton";
import { formatCurrency } from "../../../services/formatters";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "../../../services/chartTheme";
import type { TopCategoryRevenue, TopSellingProduct } from "../../../types";

interface TopProductsCategoriesPanelProps {
  topProducts: TopSellingProduct[] | undefined;
  topCategories: TopCategoryRevenue[] | undefined;
  isLoading: boolean;
  onSelectProduct: (productId: string) => void;
}

export function TopProductsCategoriesPanel({ topProducts, topCategories, isLoading, onSelectProduct }: TopProductsCategoriesPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-content-muted">Top 10 Best Selling Products</p>
        {!topProducts || topProducts.length === 0 ? (
          <p className="py-8 text-center text-sm text-content-muted">No sales yet.</p>
        ) : (
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <button
                key={product.productId}
                type="button"
                onClick={() => onSelectProduct(product.productId)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-elevated"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-amber/15 text-xs font-bold text-brand-amber">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{product.productName}</p>
                    <p className="text-xs text-content-muted">{product.unitsSold} units sold</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-brand-teal">{formatCurrency(product.revenue)}</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-content-muted">Top Performing Categories</p>
        {!topCategories || topCategories.length === 0 ? (
          <p className="py-16 text-center text-sm text-content-muted">No sales yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategories} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                />
                <Bar dataKey="revenue" fill="#14B8A6" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
