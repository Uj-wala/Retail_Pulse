import { useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../utils/cn";

interface PasswordFieldProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  autoComplete?: string;
}

export function PasswordField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  autoComplete = "current-password",
}: PasswordFieldProps<TFieldValues>) {
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-content-muted">{label}</span>
          <div className="relative">
            <input
              {...field}
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              className={cn(
                "w-full rounded-lg border bg-surface px-3.5 py-2.5 pr-10 text-sm text-content outline-none transition-colors",
                "focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20",
                fieldState.error ? "border-red-500" : "border-border/25",
              )}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldState.error && (
            <span className="mt-1 block text-xs font-medium text-red-500">{fieldState.error.message}</span>
          )}
        </label>
      )}
    />
  );
}
