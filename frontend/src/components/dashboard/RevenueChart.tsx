import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../common/Card";
import { formatCurrency } from "../../services/formatters";
import type { RevenuePoint } from "../../types";

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-content-muted">Revenue (last 30 days)</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
            <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={70} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#14B8A6" strokeWidth={2} fill="url(#revenueFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
