import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "../common/Card";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "../../services/chartTheme";
import type { InventoryCharts, StockStatus } from "../../types";

const STATUS_COLORS: Record<StockStatus, string> = {
  IN_STOCK: "#34D399",
  LOW_STOCK: "#F59E0B",
  OUT_OF_STOCK: "#F87171",
};

const STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

export function StockStatusChart({ data }: { data: InventoryCharts["byStatus"] }) {
  const chartData = data.map((entry) => ({ ...entry, label: STATUS_LABELS[entry.status] }));

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-content-muted">Stock Status Distribution</p>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-content-muted">No inventory yet</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                isAnimationActive
                animationDuration={1200}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={chartTooltipLabelStyle}
                itemStyle={chartTooltipItemStyle}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
