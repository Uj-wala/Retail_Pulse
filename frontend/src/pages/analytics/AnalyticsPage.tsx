import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { analyticsApi } from "../../api/analyticsApi";
import { RevenueChart } from "../../components/dashboard/RevenueChart";
import { TopProductsCard } from "../../components/dashboard/TopProductsCard";
import { CategoryBreakdownChart } from "../../components/dashboard/CategoryBreakdownChart";
import { StatCard, StatCardSkeleton } from "../../components/dashboard/StatCard";
import { ErrorState } from "../../components/common/ErrorState";
import { Spinner } from "../../components/common/Spinner";
import { formatCurrency } from "../../services/formatters";
import { IndianRupee, ShoppingBag, Users as UsersIcon, AlertTriangle } from "lucide-react";

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Analytics API is not reachable. Start the backend server and try again.";
  }
  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  return fallback;
}

export function AnalyticsPage() {
  const summaryQuery = useQuery({ queryKey: ["analytics", "summary"], queryFn: analyticsApi.getSummary });
  const revenueQuery = useQuery({
    queryKey: ["analytics", "revenue"],
    queryFn: () => analyticsApi.getRevenueOverTime(30),
  });
  const topProductsQuery = useQuery({
    queryKey: ["analytics", "top-products"],
    queryFn: () => analyticsApi.getTopProducts(8),
  });
  const categoryQuery = useQuery({
    queryKey: ["analytics", "sales-by-category"],
    queryFn: analyticsApi.getSalesByCategory,
  });

  const summary = summaryQuery.data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-content-muted">Deep dive into revenue, products, and category performance.</p>
      </div>

      {summaryQuery.isLoading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : summaryQuery.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Couldn't load analytics summary"
            description={getApiErrorMessage(summaryQuery.error, "Please try again.")}
            onRetry={() => summaryQuery.refetch()}
          />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Revenue" value={formatCurrency(summary!.total_revenue)} icon={<IndianRupee className="h-5 w-5" />} />
          <StatCard label="Total Orders" value={String(summary!.total_orders)} icon={<ShoppingBag className="h-5 w-5" />} />
          <StatCard label="Total Customers" value={String(summary!.total_customers)} icon={<UsersIcon className="h-5 w-5" />} />
          <StatCard label="Low Stock Items" value={String(summary!.low_stock_count)} icon={<AlertTriangle className="h-5 w-5" />} />
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {revenueQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size={24} />
            </div>
          ) : revenueQuery.isError ? (
            <ErrorState
              title="Couldn't load revenue trend"
              description={getApiErrorMessage(revenueQuery.error, "Please try again.")}
              onRetry={() => revenueQuery.refetch()}
            />
          ) : (
            <RevenueChart data={revenueQuery.data ?? []} />
          )}
        </div>
        {categoryQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size={24} />
          </div>
        ) : categoryQuery.isError ? (
          <ErrorState
            title="Couldn't load category breakdown"
            description={getApiErrorMessage(categoryQuery.error, "Please try again.")}
            onRetry={() => categoryQuery.refetch()}
          />
        ) : (
          <CategoryBreakdownChart data={categoryQuery.data ?? []} />
        )}
      </div>

      {topProductsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={24} />
        </div>
      ) : topProductsQuery.isError ? (
        <ErrorState
          title="Couldn't load top products"
          description={getApiErrorMessage(topProductsQuery.error, "Please try again.")}
          onRetry={() => topProductsQuery.refetch()}
        />
      ) : (
        <TopProductsCard products={topProductsQuery.data ?? []} />
      )}
    </div>
  );
}
