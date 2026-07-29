import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "../../common/Card";
import { ChartCardSkeleton } from "../../common/ChartCardSkeleton";
import { formatCurrency } from "../../../services/formatters";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "../../../services/chartTheme";
import { CHART_COLORS, channelLabels, paymentLabels } from "../../../services/dashboardLabels";
import type { ChannelRevenue, PaymentMethodRevenue } from "../../../types";

interface SalesBreakdownChartsProps {
  byPaymentMethod: PaymentMethodRevenue[] | undefined;
  byChannel: ChannelRevenue[] | undefined;
  isLoading: boolean;
}

export function SalesBreakdownCharts({ byPaymentMethod, byChannel, isLoading }: SalesBreakdownChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    );
  }

  const paymentData = (byPaymentMethod ?? []).map((entry) => ({ name: paymentLabels[entry.paymentMethod], revenue: entry.revenue }));
  const channelData = (byChannel ?? []).map((entry) => ({ name: channelLabels[entry.salesChannel], revenue: entry.revenue }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-content-muted">Sales by Payment Method</p>
        {paymentData.length === 0 ? (
          <p className="py-16 text-center text-sm text-content-muted">No sales yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="revenue" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} isAnimationActive animationDuration={1200}>
                  {paymentData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
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

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-content-muted">Sales by Sales Channel</p>
        {channelData.length === 0 ? (
          <p className="py-16 text-center text-sm text-content-muted">No sales yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelData} dataKey="revenue" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} isAnimationActive animationDuration={1200}>
                  {channelData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
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
    </div>
  );
}
