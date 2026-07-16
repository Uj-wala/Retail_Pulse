import type { InputHTMLAttributes } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { cn } from "../../utils/cn";

interface FormTextFieldProps<TFieldValues extends FieldValues>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue"> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
}

export function FormTextField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  type = "text",
  className,
  ...rest
}: FormTextFieldProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-content-muted">{label}</span>
          <input
            {...field}
            {...rest}
            type={type}
            className={cn(
              "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-content outline-none transition-colors",
              "placeholder:text-content-muted/60 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20",
              fieldState.error ? "border-red-500" : "border-border/25",
              className,
            )}
          />
          {fieldState.error && (
            <span className="mt-1 block text-xs font-medium text-red-500">{fieldState.error.message}</span>
          )}
        </label>
      )}
    />
  );
}
