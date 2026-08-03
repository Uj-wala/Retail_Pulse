import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Download, FileText, RefreshCw } from "lucide-react";
import { dashboardAnalyticsApi } from "../../api/dashboardAnalyticsApi";
import { Button } from "../../components/common/Button";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { Spinner } from "../../components/common/Spinner";
import { FilterBar } from "../../components/dashboard/retail/FilterBar";
import { KpiGrid } from "../../components/dashboard/retail/KpiGrid";
import { TrendCharts } from "../../components/dashboard/retail/TrendCharts";
import { TopProductsCategoriesPanel } from "../../components/dashboard/retail/TopProductsCategoriesPanel";
import { SalesBreakdownCharts } from "../../components/dashboard/retail/SalesBreakdownCharts";
import { InventoryOverviewCharts } from "../../components/dashboard/retail/InventoryOverviewCharts";
import { StockAlertsPanel } from "../../components/dashboard/retail/StockAlertsPanel";
import { CustomerInsightsPanel } from "../../components/dashboard/retail/CustomerInsightsPanel";
import { DrilldownModal, type DrilldownRequest } from "../../components/dashboard/retail/DrilldownModal";
import type { DashboardFilterValues, DashboardGranularity } from "../../types";

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Analytics API is not reachable. Start the backend server and try again.";
  }
  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  return fallback;
}

const KPI_LABELS: Record<string, string> = {
  revenue: "Revenue — Sales Transactions",
  orders: "Orders",
  products_sold: "Products Sold",
  average_order_value: "Average Order Value — Sales Transactions",
  inventory_value: "Inventory Value by Product",
  low_stock: "Low Stock Products",
  out_of_stock: "Out of Stock Products",
  categories: "Categories",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsPage() {
  const [filters, setFilters] = useState<DashboardFilterValues>({});
  const [granularity, setGranularity] = useState<DashboardGranularity>("daily");
  const [drilldown, setDrilldown] = useState<DrilldownRequest | null>(null);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);
  const hasMounted = useRef(false);
  const filtersAppliedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["analytics", "dashboard", "overview", filters, granularity],
    queryFn: () => dashboardAnalyticsApi.getOverview(filters, granularity),
  });

  const filterOptionsQuery = useQuery({
    queryKey: ["analytics", "dashboard", "filter-options"],
    queryFn: dashboardAnalyticsApi.getFilterOptions,
  });

  // Audit: log once when the dashboard is first viewed.
  useEffect(() => {
    dashboardAnalyticsApi.logAuditEvent("viewed");
  }, []);

  // Audit: log filter changes, debounced so rapid edits collapse into one entry.
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (filtersAppliedTimer.current) clearTimeout(filtersAppliedTimer.current);
    filtersAppliedTimer.current = setTimeout(() => {
      dashboardAnalyticsApi.logAuditEvent("filters_applied", filters);
    }, 800);
    return () => {
      if (filtersAppliedTimer.current) clearTimeout(filtersAppliedTimer.current);
    };
  }, [filters]);

  async function handleExport(format: "csv" | "pdf", section: "kpis" | "sales" | "inventory") {
    setIsExporting(format);
    try {
      const blob = format === "csv" ? await dashboardAnalyticsApi.exportCsv(section, filters) : await dashboardAnalyticsApi.exportPdf(section, filters);
      downloadBlob(blob, `dashboard-${section}.${format}`);
    } finally {
      setIsExporting(null);
    }
  }

  const overview = overviewQuery.data;
  const hasAnyData = overview
    ? overview.kpis.totalRevenue > 0 ||
      overview.kpis.totalOrders > 0 ||
      overview.kpis.totalInventoryValue > 0 ||
      overview.kpis.totalCategories > 0
    : false;

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold">Retail Analytics Dashboard</h1>
          <p className="text-sm text-content-muted">KPIs, sales performance, and inventory health across your company.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => overviewQuery.refetch()} isLoading={overviewQuery.isFetching}>
            Refresh
          </Button>
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
            isLoading={isExporting === "csv"}
            onClick={() => handleExport("csv", "kpis")}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            icon={<FileText className="h-4 w-4" />}
            isLoading={isExporting === "pdf"}
            onClick={() => handleExport("pdf", "kpis")}
          >
            Export PDF
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <FilterBar value={filters} onChange={setFilters} options={filterOptionsQuery.data} />
      </div>

      {overviewQuery.isError ? (
        <ErrorState
          title="Couldn't load the dashboard"
          description={getApiErrorMessage(overviewQuery.error, "Please try again.")}
          onRetry={() => overviewQuery.refetch()}
        />
      ) : !overviewQuery.isLoading && !hasAnyData ? (
        <EmptyState
          title="No data for the selected filters"
          description="Try widening your date range or clearing filters to see dashboard results."
          action={
            <Button variant="outline" onClick={() => setFilters({})}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <KpiGrid kpis={overview?.kpis} isLoading={overviewQuery.isLoading} onSelect={(kpi) => setDrilldown({ kind: "kpi", kpi, label: KPI_LABELS[kpi] })} />

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-content-muted">Sales Analytics</h2>
            <div className="space-y-4">
              <TrendCharts
                revenueTrend={overview?.sales.revenueTrend}
                salesTrend={overview?.sales.salesTrend}
                granularity={granularity}
                onGranularityChange={setGranularity}
                isLoading={overviewQuery.isLoading}
              />
              <TopProductsCategoriesPanel
                topProducts={overview?.sales.topProducts}
                topCategories={overview?.sales.topCategories}
                isLoading={overviewQuery.isLoading}
                onSelectProduct={(productId) => {
                  const name = filterOptionsQuery.data?.products.find((p) => p.id === productId)?.name ?? "Product";
                  setDrilldown({ kind: "product", productId, label: `${name} — Sales Transactions` });
                }}
              />
              <SalesBreakdownCharts byPaymentMethod={overview?.sales.byPaymentMethod} byChannel={overview?.sales.byChannel} isLoading={overviewQuery.isLoading} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-content-muted">Inventory Analytics</h2>
            <div className="space-y-4">
              <InventoryOverviewCharts
                distributionByCategory={overview?.inventory.distributionByCategory}
                stockStatusSummary={overview?.inventory.stockStatusSummary}
                valueByCategory={overview?.inventory.valueByCategory}
                isLoading={overviewQuery.isLoading}
              />
              <StockAlertsPanel topLowStock={overview?.inventory.topLowStock} outOfStock={overview?.inventory.outOfStock} isLoading={overviewQuery.isLoading} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-content-muted">Customer Analytics</h2>
            <CustomerInsightsPanel insights={overview?.customers} isLoading={overviewQuery.isLoading} />
          </section>
        </div>
      )}

      {overviewQuery.isFetching && !overviewQuery.isLoading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs font-semibold text-content-muted shadow-lg">
          <Spinner size={14} />
          Refreshing dashboard…
        </div>
      )}

      <DrilldownModal request={drilldown} filters={filters} onClose={() => setDrilldown(null)} />
    </div>
  );
}
