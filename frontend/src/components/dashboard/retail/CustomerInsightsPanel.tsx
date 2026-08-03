import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../../common/Card";
import { ChartCardSkeleton } from "../../common/ChartCardSkeleton";
import { formatCurrency, formatDate } from "../../../services/formatters";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "../../../services/chartTheme";
import { CHART_COLORS } from "../../../services/dashboardLabels";
import type { CustomerInsights } from "../../../types";

interface CustomerInsightsPanelProps {
  insights: CustomerInsights | undefined;
  isLoading: boolean;
}

export function CustomerInsightsPanel({ insights, isLoading }: CustomerInsightsPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    );
  }

  const topCustomers = insights?.topCustomers ?? [];
  const recentCustomers = insights?.recentCustomers ?? [];
  const customerGrowth = insights?.customerGrowth ?? [];
  const revenueContribution = insights?.customerRevenueContribution ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold text-content-muted">Customer Growth</p>
          {customerGrowth.length === 0 ? (
            <p className="py-16 text-center text-sm text-content-muted">No customers registered yet.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={customerGrowth}>
                  <defs>
                    <linearGradient id="dashboardCustomerGrowthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={40} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                  <Area type="monotone" dataKey="cumulativeCustomers" name="Total Customers" stroke="#14B8A6" strokeWidth={2} fill="url(#dashboardCustomerGrowthFill)" isAnimationActive animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold text-content-muted">Customer Revenue Contribution</p>
          {revenueContribution.length === 0 ? (
            <p className="py-16 text-center text-sm text-content-muted">No revenue yet.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueContribution} dataKey="revenue" nameKey="customerType" innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive animationDuration={1200}>
                    {revenueContribution.map((entry, index) => (
                      <Cell key={entry.customerType} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold text-content-muted">Top Customers</p>
          {topCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-content-muted">No purchases yet.</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.customerId} className="flex items-center justify-between rounded-lg px-2 py-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-amber/15 text-xs font-bold text-brand-amber">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold">{customer.name}</p>
                  </div>
                  <p className="text-sm font-bold text-brand-teal">{formatCurrency(customer.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold text-content-muted">Recent Customers</p>
          {recentCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-content-muted">No customers registered yet.</p>
          ) : (
            <div className="space-y-2">
              {recentCustomers.map((customer) => (
                <div key={customer.customerId} className="flex items-center justify-between rounded-lg px-2 py-2">
                  <div>
                    <p className="text-sm font-semibold">{customer.name}</p>
                    <p className="text-xs text-content-muted">{customer.customerType} &middot; {customer.customerCode}</p>
                  </div>
                  <p className="text-xs text-content-muted">{formatDate(customer.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
