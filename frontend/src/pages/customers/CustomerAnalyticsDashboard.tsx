import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, Users, UserCheck, UserPlus, Repeat, Wallet, IndianRupee, Gauge } from "lucide-react";
import { customerApi, type CustomerAnalyticsFilters, type CustomerExportSection } from "../../api/customerApi";
import { Card } from "../../components/common/Card";
import { ChartCardSkeleton } from "../../components/common/ChartCardSkeleton";
import { Skeleton } from "../../components/common/Skeleton";
import { Button } from "../../components/common/Button";
import { formatCurrency } from "../../services/formatters";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "../../services/chartTheme";
import { CHART_COLORS } from "../../services/dashboardLabels";
import { useNotification } from "../../hooks/useNotification";
import type { CustomerAnalyticsKpis } from "../../types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const KPI_DEFINITIONS: { key: keyof CustomerAnalyticsKpis; label: string; icon: ReactNode; format: (k: CustomerAnalyticsKpis) => string }[] = [
  { key: "totalCustomers", label: "Total Customers", icon: <Users className="h-5 w-5" />, format: (k) => String(k.totalCustomers) },
  { key: "activeCustomers", label: "Active Customers", icon: <UserCheck className="h-5 w-5" />, format: (k) => String(k.activeCustomers) },
  { key: "newCustomers", label: "New Customers", icon: <UserPlus className="h-5 w-5" />, format: (k) => String(k.newCustomers) },
  { key: "returningCustomers", label: "Returning Customers", icon: <Repeat className="h-5 w-5" />, format: (k) => String(k.returningCustomers) },
  { key: "averageCustomerSpend", label: "Average Customer Spend", icon: <Wallet className="h-5 w-5" />, format: (k) => formatCurrency(k.averageCustomerSpend) },
  { key: "totalRevenueGenerated", label: "Total Revenue Generated", icon: <IndianRupee className="h-5 w-5" />, format: (k) => formatCurrency(k.totalRevenueGenerated) },
  { key: "averagePurchaseFrequency", label: "Avg Purchase Frequency", icon: <Gauge className="h-5 w-5" />, format: (k) => k.averagePurchaseFrequency.toFixed(1) },
];

export function CustomerAnalyticsDashboard() {
  const { notify } = useNotification();
  const [customerType, setCustomerType] = useState("");
  const [city, setCity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  const filters: CustomerAnalyticsFilters = {
    customerType: (customerType || undefined) as CustomerAnalyticsFilters["customerType"],
    city: city || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const locationsQuery = useQuery({ queryKey: ["customer-locations"], queryFn: () => customerApi.listLocations() });
  const overviewQuery = useQuery({
    queryKey: ["customer-analytics", filters],
    queryFn: () => customerApi.getAnalyticsOverview(filters),
  });

  const overview = overviewQuery.data;
  const isLoading = overviewQuery.isLoading;
  const locations = locationsQuery.data?.locations ?? [];

  async function handleExport(format: "csv" | "pdf", section: CustomerExportSection) {
    setExporting(`${section}-${format}`);
    try {
      const blob = format === "csv" ? await customerApi.exportCsv(section, filters) : await customerApi.exportPdf(section, filters);
      downloadBlob(blob, `${section}.${format}`);
    } catch {
      notify("Could not export the report. Please try again.", "error");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={customerType}
          onChange={(event) => setCustomerType(event.target.value)}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="">All Types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="CORPORATE">Corporate</option>
        </select>
        <select
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="">All Cities</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-content-muted">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-lg border border-border/25 bg-surface px-2 py-2 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-content-muted">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-lg border border-border/25 bg-surface px-2 py-2 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
          />
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} isLoading={exporting === "customer-analytics-csv"} onClick={() => handleExport("csv", "customer-analytics")}>
            Analytics CSV
          </Button>
          <Button variant="outline" icon={<FileText className="h-4 w-4" />} isLoading={exporting === "customer-analytics-pdf"} onClick={() => handleExport("pdf", "customer-analytics")}>
            Analytics PDF
          </Button>
          <Button variant="outline" icon={<Download className="h-4 w-4" />} isLoading={exporting === "top-customers-csv"} onClick={() => handleExport("csv", "top-customers")}>
            Top Customers CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_DEFINITIONS.map((definition) =>
          isLoading || !overview ? (
            <Card key={definition.key} className="p-5">
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="mt-2.5 h-7 w-16" />
                </div>
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              </div>
            </Card>
          ) : (
            <Card key={definition.key} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-content-muted">{definition.label}</p>
                  <p className="mt-1 text-2xl font-extrabold">{definition.format(overview.kpis)}</p>
                </div>
                <div className="rounded-lg bg-brand-teal/10 p-2 text-brand-teal">{definition.icon}</div>
              </div>
            </Card>
          ),
        )}
      </div>

      {isLoading || !overview ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Customer Growth Trend</p>
              {overview.growthTrend.length === 0 ? (
                <p className="py-16 text-center text-sm text-content-muted">No customers registered yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.growthTrend}>
                      <defs>
                        <linearGradient id="customerGrowthFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                      <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={40} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                      <Area type="monotone" dataKey="cumulativeCustomers" name="Total Customers" stroke="#14B8A6" strokeWidth={2} fill="url(#customerGrowthFill)" isAnimationActive animationDuration={1200} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">New vs Returning Customers</p>
              {overview.newVsReturning.length === 0 ? (
                <p className="py-16 text-center text-sm text-content-muted">No purchases yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.newVsReturning}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                      <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={40} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="new" name="New" fill="#14B8A6" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1200} />
                      <Bar dataKey="returning" name="Returning" fill="#1D4ED8" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Revenue by Customer Type</p>
              {overview.revenueByType.length === 0 ? (
                <p className="py-16 text-center text-sm text-content-muted">No revenue yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={overview.revenueByType} dataKey="revenue" nameKey="customerType" innerRadius={55} outerRadius={85} paddingAngle={2} isAnimationActive animationDuration={1200}>
                        {overview.revenueByType.map((entry, index) => (
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

            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Top 10 Customers by Revenue</p>
              {overview.topCustomers.length === 0 ? (
                <p className="py-8 text-center text-sm text-content-muted">No purchases yet.</p>
              ) : (
                <div className="space-y-2">
                  {overview.topCustomers.map((customer, index) => (
                    <div key={customer.customerId} className="flex items-center justify-between rounded-lg px-2 py-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-amber/15 text-xs font-bold text-brand-amber">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{customer.name}</p>
                          <p className="text-xs text-content-muted">
                            {customer.totalOrders} orders{customer.favoriteProduct ? ` · Favorite: ${customer.favoriteProduct}` : ""}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-brand-teal">{formatCurrency(customer.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Purchase Frequency Distribution</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.purchaseFrequency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                    <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={40} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                    <Bar dataKey="count" name="Customers" fill="#A78BFA" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Location Distribution</p>
              {overview.locationDistribution.length === 0 ? (
                <p className="py-16 text-center text-sm text-content-muted">No location data yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.locationDistribution} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                      <YAxis dataKey="location" type="category" width={100} tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                      <Bar dataKey="count" name="Customers" fill="#14B8A6" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Monthly Customer Acquisition</p>
              {overview.monthlyAcquisition.length === 0 ? (
                <p className="py-16 text-center text-sm text-content-muted">No customers registered yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.monthlyAcquisition}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                      <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={40} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                      <Bar dataKey="count" name="New Customers" fill="#38BDF8" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold text-content-muted">Customer Spending Distribution</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.spendingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" />
                    <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-content-muted" width={40} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                    <Bar dataKey="count" name="Customers" fill="#FB7185" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
