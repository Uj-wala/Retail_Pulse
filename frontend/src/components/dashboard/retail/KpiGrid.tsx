import type { ReactNode } from "react";
import {
  IndianRupee,
  ShoppingBag,
  PackageCheck,
  Wallet,
  Warehouse,
  AlertTriangle,
  PackageX,
  Tags,
} from "lucide-react";
import { Card } from "../../common/Card";
import { Skeleton } from "../../common/Skeleton";
import { formatCurrency } from "../../../services/formatters";
import type { DashboardKpiKey, DashboardKpis } from "../../../types";

interface KpiGridProps {
  kpis: DashboardKpis | undefined;
  isLoading: boolean;
  onSelect: (kpi: DashboardKpiKey) => void;
}

interface KpiDefinition {
  key: DashboardKpiKey;
  label: string;
  icon: ReactNode;
  format: (kpis: DashboardKpis) => string;
}

const KPI_DEFINITIONS: KpiDefinition[] = [
  { key: "revenue", label: "Total Revenue", icon: <IndianRupee className="h-5 w-5" />, format: (k) => formatCurrency(k.totalRevenue) },
  { key: "orders", label: "Total Orders", icon: <ShoppingBag className="h-5 w-5" />, format: (k) => String(k.totalOrders) },
  { key: "products_sold", label: "Total Products Sold", icon: <PackageCheck className="h-5 w-5" />, format: (k) => String(k.totalProductsSold) },
  { key: "average_order_value", label: "Average Order Value", icon: <Wallet className="h-5 w-5" />, format: (k) => formatCurrency(k.averageOrderValue) },
  { key: "inventory_value", label: "Total Inventory Value", icon: <Warehouse className="h-5 w-5" />, format: (k) => formatCurrency(k.totalInventoryValue) },
  { key: "low_stock", label: "Low Stock Products", icon: <AlertTriangle className="h-5 w-5" />, format: (k) => String(k.lowStockProducts) },
  { key: "out_of_stock", label: "Out of Stock Products", icon: <PackageX className="h-5 w-5" />, format: (k) => String(k.outOfStockProducts) },
  { key: "categories", label: "Total Categories", icon: <Tags className="h-5 w-5" />, format: (k) => String(k.totalCategories) },
];

export function KpiGrid({ kpis, isLoading, onSelect }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {KPI_DEFINITIONS.map((definition) =>
        isLoading || !kpis ? (
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
          <button key={definition.key} type="button" onClick={() => onSelect(definition.key)} className="text-left">
            <Card className="cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:border-brand-teal/50 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-content-muted">{definition.label}</p>
                  <p className="mt-1 text-2xl font-extrabold">{definition.format(kpis)}</p>
                </div>
                <div className="rounded-lg bg-brand-teal/10 p-2 text-brand-teal">{definition.icon}</div>
              </div>
              <p className="mt-2 text-xs font-semibold text-brand-teal">View details</p>
            </Card>
          </button>
        ),
      )}
    </div>
  );
}
