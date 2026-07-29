import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../../common/Card";
import { ChartCardSkeleton } from "../../common/ChartCardSkeleton";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "../../../services/chartTheme";
import { CHART_COLORS } from "../../../services/dashboardLabels";
import type { CategoryDistribution, CategoryValue, StockStatusSummary } from "../../../types";

interface InventoryOverviewChartsProps {
  distributionByCategory: CategoryDistribution[] | undefined;
  stockStatusSummary: StockStatusSummary | undefined;
  valueByCategory: CategoryValue[] | undefined;
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  "In Stock": "#34D399",
  "Low Stock": "#F59E0B",
  "Out of Stock": "#FB7185",
};

interface CategoryTickProps {
  x?: number;
  y?: number;
  payload?: {
    value?: string | number;
  };
}

function renderCategoryTick({ x = 0, y = 0, payload }: CategoryTickProps) {
  const label = String(payload?.value ?? "");
  const lines = label.includes(" & ") ? label.split(" & ").map((part, index) => (index === 0 ? `${part} &` : part)) : [label];

  return (
    <text x={x} y={y + 12} textAnchor="middle" fill="currentColor" className="text-content-muted" fontSize={10}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : 12}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function InventoryOverviewCharts({ distributionByCategory, stockStatusSummary, valueByCategory, isLoading }: InventoryOverviewChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    );
  }

  const statusData = stockStatusSummary
    ? [
        { name: "In Stock", value: stockStatusSummary.inStock },
        { name: "Low Stock", value: stockStatusSummary.lowStock },
        { name: "Out of Stock", value: stockStatusSummary.outOfStock },
      ].filter((entry) => entry.value > 0)
    : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-content-muted">Inventory Distribution by Category</p>
        {!distributionByCategory || distributionByCategory.length === 0 ? (
          <p className="py-16 text-center text-sm text-content-muted">No products yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionByCategory} margin={{ bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                <XAxis dataKey="category" tick={renderCategoryTick} interval={0} height={46} tickMargin={8} />
                <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={40} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                />
                <Bar dataKey="totalStock" name="Stock Units" fill="#1D4ED8" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-content-muted">Stock Status Summary</p>
        {statusData.length === 0 ? (
          <p className="py-16 text-center text-sm text-content-muted">No products yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} isAnimationActive animationDuration={1200}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-content-muted">Inventory Value by Category</p>
        {!valueByCategory || valueByCategory.length === 0 ? (
          <p className="py-16 text-center text-sm text-content-muted">No products yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={valueByCategory} dataKey="inventoryValue" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2} isAnimationActive animationDuration={1200}>
                  {valueByCategory.map((entry, index) => (
                    <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
