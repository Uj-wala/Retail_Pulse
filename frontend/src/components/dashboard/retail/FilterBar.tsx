import { X } from "lucide-react";
import { Card } from "../../common/Card";
import { Button } from "../../common/Button";
import { channelLabels, paymentLabels } from "../../../services/dashboardLabels";
import type { DashboardFilterOptions, DashboardFilterValues } from "../../../types";

interface FilterBarProps {
  value: DashboardFilterValues;
  onChange: (next: DashboardFilterValues) => void;
  options: DashboardFilterOptions | undefined;
}

const selectClassName =
  "w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-content focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";

export function FilterBar({ value, onChange, options }: FilterBarProps) {
  const hasActiveFilters = Object.values(value).some((entry) => Boolean(entry));

  function set<K extends keyof DashboardFilterValues>(key: K, next: DashboardFilterValues[K]) {
    onChange({ ...value, [key]: next || undefined });
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <label className="flex flex-col gap-1 text-xs font-semibold text-content-muted">
          Date From
          <input
            type="date"
            className={selectClassName}
            value={value.dateFrom ?? ""}
            onChange={(event) => set("dateFrom", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-content-muted">
          Date To
          <input
            type="date"
            className={selectClassName}
            value={value.dateTo ?? ""}
            onChange={(event) => set("dateTo", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-content-muted">
          Product
          <select className={selectClassName} value={value.productId ?? ""} onChange={(event) => set("productId", event.target.value)}>
            <option value="">All Products</option>
            {options?.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-content-muted">
          Category
          <select
            className={selectClassName}
            value={value.categoryId ?? ""}
            onChange={(event) => set("categoryId", event.target.value)}
          >
            <option value="">All Categories</option>
            {options?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-content-muted">
          Brand
          <select className={selectClassName} value={value.brand ?? ""} onChange={(event) => set("brand", event.target.value)}>
            <option value="">All Brands</option>
            {options?.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-content-muted">
          Sales Channel
          <select
            className={selectClassName}
            value={value.salesChannel ?? ""}
            onChange={(event) => set("salesChannel", event.target.value as DashboardFilterValues["salesChannel"])}
          >
            <option value="">All Channels</option>
            {options?.salesChannels.map((channel) => (
              <option key={channel} value={channel}>
                {channelLabels[channel]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-content-muted">
          Payment Method
          <select
            className={selectClassName}
            value={value.paymentMethod ?? ""}
            onChange={(event) => set("paymentMethod", event.target.value as DashboardFilterValues["paymentMethod"])}
          >
            <option value="">All Methods</option>
            {options?.paymentMethods.map((method) => (
              <option key={method} value={method}>
                {paymentLabels[method]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hasActiveFilters && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => onChange({})} className="!px-3 !py-1.5 text-xs">
            Clear filters
          </Button>
        </div>
      )}
    </Card>
  );
}
