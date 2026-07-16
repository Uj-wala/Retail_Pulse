import type { ReactNode } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { cn } from "../../utils/cn";

interface FormSelectProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  children: ReactNode;
}

export function FormSelect<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  children,
}: FormSelectProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-content-muted">{label}</span>
          <select
            {...field}
            className={cn(
              "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-content outline-none transition-colors",
              "focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20",
              fieldState.error ? "border-red-500" : "border-border/25",
            )}
          >
            {children}
          </select>
          {fieldState.error && (
            <span className="mt-1 block text-xs font-medium text-red-500">{fieldState.error.message}</span>
          )}
        </label>
      )}
    />
  );
}
