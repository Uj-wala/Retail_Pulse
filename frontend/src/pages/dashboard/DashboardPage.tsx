import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingBag, Users as UsersIcon, AlertTriangle } from "lucide-react";
import { analyticsApi } from "../../api/analyticsApi";
import { StatCard } from "../../components/dashboard/StatCard";
import { RevenueChart } from "../../components/dashboard/RevenueChart";
import { TopProductsCard } from "../../components/dashboard/TopProductsCard";
import { CategoryBreakdownChart } from "../../components/dashboard/CategoryBreakdownChart";
import { Spinner } from "../../components/common/Spinner";
import { formatCurrency } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();

  const summaryQuery = useQuery({ queryKey: ["analytics", "summary"], queryFn: analyticsApi.getSummary });
  const revenueQuery = useQuery({
    queryKey: ["analytics", "revenue"],
    queryFn: () => analyticsApi.getRevenueOverTime(30),
  });
  const topProductsQuery = useQuery({
    queryKey: ["analytics", "top-products"],
    queryFn: () => analyticsApi.getTopProducts(5),
  });
  const categoryQuery = useQuery({
    queryKey: ["analytics", "sales-by-category"],
    queryFn: analyticsApi.getSalesByCategory,
  });

  const summary = summaryQuery.data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-content-muted">
          Track sales, products, inventory, and analytics for your company.
        </p>
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(summary?.total_revenue ?? 0)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            label="Total Orders"
            value={String(summary?.total_orders ?? 0)}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
          <StatCard
            label="Total Customers"
            value={String(summary?.total_customers ?? 0)}
            icon={<UsersIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Low Stock Items"
            value={String(summary?.low_stock_count ?? 0)}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueQuery.data ?? []} />
        </div>
        <TopProductsCard products={topProductsQuery.data ?? []} />
      </div>

      <CategoryBreakdownChart data={categoryQuery.data ?? []} />
    </div>
  );
}
