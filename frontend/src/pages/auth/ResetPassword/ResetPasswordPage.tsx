import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CheckCircle2 } from "lucide-react";
import { authApi } from "../../../api/authApi";
import { PasswordField } from "../../../components/forms/PasswordField";
import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";
import { resetPasswordSchema, type ResetPasswordFormValues } from "./resetPasswordSchema";

function getResetErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "Something went wrong. Please try again.";

  if (!error.response) {
    return "Reset password API is not reachable. Start the backend server and try again.";
  }

  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;

  return "Could not reset your password. Please request a new reset link.";
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      authApi.resetPassword({
        token: token ?? "",
        new_password: values.newPassword,
        confirm_new_password: values.confirmNewPassword,
      }),
    onError: (error) => {
      setErrorMessage(getResetErrorMessage(error));
    },
  });

  if (!token) {
    return (
      <Card className="w-full max-w-md p-6 sm:p-10">
        <h1 className="text-2xl font-extrabold">Invalid reset link</h1>
        <p className="mb-6 mt-1 text-content-muted">
          This password reset link is missing its token. Please request a new one.
        </p>
        <Link to="/forgot-password" className="font-semibold text-brand-teal hover:underline">
          Request a new link
        </Link>
      </Card>
    );
  }

  if (resetPasswordMutation.isSuccess) {
    return (
      <Card className="w-full max-w-md p-6 sm:p-10">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-teal" />
          <h1 className="text-xl font-extrabold">Password reset</h1>
          <p className="text-content-muted">{resetPasswordMutation.data.message}</p>
          <Link to="/login" className="mt-2 font-semibold text-brand-teal hover:underline">
            Back to Sign In
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-10">
      <h1 className="text-2xl font-extrabold">Reset Password</h1>
      <p className="mb-6 mt-1 text-content-muted">Enter a new password for your account.</p>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit((values) => {
          setErrorMessage(null);
          resetPasswordMutation.mutate(values);
        })}
        noValidate
      >
        <PasswordField name="newPassword" control={control} label="New Password" autoComplete="new-password" />
        <PasswordField
          name="confirmNewPassword"
          control={control}
          label="Confirm New Password"
          autoComplete="new-password"
        />
        <Button type="submit" isLoading={resetPasswordMutation.isPending} className="mb-4 mt-2 w-full py-3">
          {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
        </Button>
        <div className="flex justify-center text-sm">
          <Link to="/login" className="font-semibold text-brand-teal hover:underline">
            Back to Sign In
          </Link>
        </div>
      </form>
    </Card>
  );
}
