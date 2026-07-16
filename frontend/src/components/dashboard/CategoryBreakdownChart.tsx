import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "../common/Card";
import { formatCurrency } from "../../services/formatters";
import type { CategoryRevenue } from "../../types";

const COLORS = ["#14B8A6", "#F59E0B", "#38BDF8", "#A78BFA", "#FB7185", "#34D399"];

export function CategoryBreakdownChart({ data }: { data: CategoryRevenue[] }) {
  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-content-muted">Revenue by Category</p>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-content-muted">No sales yet</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="revenue" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
