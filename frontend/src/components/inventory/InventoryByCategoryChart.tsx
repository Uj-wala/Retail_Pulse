import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../common/Card";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "../../services/chartTheme";
import type { InventoryCharts } from "../../types";

export function InventoryByCategoryChart({ data }: { data: InventoryCharts["byCategory"] }) {
  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-content-muted">Inventory by Category</p>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-content-muted">No inventory yet</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={chartTooltipLabelStyle}
                itemStyle={chartTooltipItemStyle}
                cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
              />
              <Bar dataKey="totalStock" name="Total Stock" fill="#14B8A6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
