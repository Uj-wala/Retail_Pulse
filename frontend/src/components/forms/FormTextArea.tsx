import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { cn } from "../../utils/cn";

interface FormTextAreaProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  rows?: number;
}

export function FormTextArea<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  rows = 3,
}: FormTextAreaProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-content-muted">{label}</span>
          <textarea
            {...field}
            rows={rows}
            className={cn(
              "w-full resize-none rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-content outline-none transition-colors",
              "focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20",
              fieldState.error ? "border-red-500" : "border-border/25",
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
