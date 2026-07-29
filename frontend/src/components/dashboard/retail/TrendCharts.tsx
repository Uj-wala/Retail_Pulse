import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../../common/Card";
import { ChartCardSkeleton } from "../../common/ChartCardSkeleton";
import { formatCurrency } from "../../../services/formatters";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "../../../services/chartTheme";
import type { DashboardGranularity, RevenueTrendPoint, SalesTrendPoint } from "../../../types";

interface TrendChartsProps {
  revenueTrend: RevenueTrendPoint[] | undefined;
  salesTrend: SalesTrendPoint[] | undefined;
  granularity: DashboardGranularity;
  onGranularityChange: (granularity: DashboardGranularity) => void;
  isLoading: boolean;
}

const GRANULARITY_OPTIONS: { value: DashboardGranularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function GranularityToggle({ value, onChange }: { value: DashboardGranularity; onChange: (next: DashboardGranularity) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-surface-elevated p-1">
      {GRANULARITY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
            value === option.value ? "bg-brand-teal text-[#042F2E]" : "text-content-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TrendCharts({ revenueTrend, salesTrend, granularity, onGranularityChange, isLoading }: TrendChartsProps) {
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
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-content-muted">Revenue Trend</p>
          <GranularityToggle value={granularity} onChange={onGranularityChange} />
        </div>
        {!revenueTrend || revenueTrend.length === 0 ? (
          <p className="py-16 text-center text-sm text-content-muted">No revenue in this period.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={70} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Area type="monotone" dataKey="revenue" stroke="#14B8A6" strokeWidth={2} fill="url(#dashboardRevenueFill)" isAnimationActive animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-content-muted">Sales Trend (Orders &amp; Units Sold)</p>
        {!salesTrend || salesTrend.length === 0 ? (
          <p className="py-16 text-center text-sm text-content-muted">No sales in this period.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={40} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="orders" name="Orders" fill="#1D4ED8" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1200} />
                <Bar dataKey="unitsSold" name="Units Sold" fill="#14B8A6" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
